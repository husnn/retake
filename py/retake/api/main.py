import os

from datetime import datetime, timezone
from modal import asgi_app, container_app, Dict, Image, NetworkFileSystem, Secret, Stub
from modal.call_graph import InputInfo, InputStatus
from typing import cast, Optional

from retake.api.types import Clip, Job, Source, SourceType, VideoResult
from retake.sage.types import FrameData, Segment

BASE_DIR = "/runtime"
CACHE_DIR = BASE_DIR + "/cache"

volume = NetworkFileSystem.persisted("recircle-runtime-test")

env_vars = dict({
    "ENV": "test",
    "BASE_DIR": BASE_DIR,
    "HF_HOME": CACHE_DIR,
    "XDG_CACHE_HOME": CACHE_DIR,
    "DEEPFACE_HOME": CACHE_DIR,
    "S3_VIDEOS_NAME": "recircle-media-test",
    "WHISPERX_MODEL": "large-v2"
})

requirements_txt = os.path.dirname(__file__) + "/../sage/requirements.txt"


def setup():
    from whisperx import load_model
    load_model(os.getenv("WHISPERX_MODEL"), device="cpu", compute_type="int8")

image = (
    Image.micromamba()
        .apt_install("git", "ffmpeg")
        .micromamba_install(
            "cudatoolkit=11.8",
            "cudnn=8.8.0",
            "cuda-nvcc",
            channels=["conda-forge", "nvidia"]
        )
        .micromamba_install("tensorflow==2.12.0", channels=["main"])
        .run_commands("python3 -m pip install torch==2.0.0+cu118 torchvision==0.15.1+cu118 torchaudio==2.0.1 --index-url https://download.pytorch.org/whl/cu118")
        .pip_install("git+https://github.com/m-bain/whisperx.git")
        .pip_install_from_requirements(requirements_txt)
        .env(env_vars)
        .run_function(setup, network_file_systems={BASE_DIR: volume})
)


def setup_deepface():
    from deepface.DeepFace import build_model
    build_model("Facenet")

deepface_image = (
    Image.conda()
        .conda_install(
            "cudatoolkit=11.2",
            "cudnn=8.1.0",
            "cuda-nvcc",
            channels=["conda-forge", "nvidia"],
        )
        .pip_install("tensorflow~=2.9.1")
        .apt_install("ffmpeg")
        .pip_install_from_requirements(requirements_txt)
        .pip_install("deepface")
        .env(env_vars)
        .run_function(setup_deepface, network_file_systems={BASE_DIR: volume})
)

stub = Stub(
    "sage",
    image=image
)

stub.jobs = Dict.new()


@stub.function(
    network_file_systems={BASE_DIR: volume},
    keep_warm=1
)
@asgi_app()
def fastapi_app():
    from retake.api import api
    return api.app


def get_video_file(id: str, src: Source) -> str:
    from retake.sage.s3 import download_file_to_path
    from retake.sage.config import S3_VIDEOS, VIDEO_DIR
    from retake.sage.utils import ensure_dir_exists

    video_dir = VIDEO_DIR + f"/{id}"
    ensure_dir_exists(video_dir)

    _, file_extension = os.path.splitext(src.uri)
    file_path = video_dir + f"/video{file_extension}"

    if os.path.exists(file_path):
        return file_path
    
    if src.type == SourceType.S3:
        download_file_to_path(S3_VIDEOS, src.uri, file_path)
    else:
        from shutil import copy
        copy(src.uri, file_path)

    return file_path


@stub.function(
    cpu=2,
    gpu="T4",
    network_file_systems={BASE_DIR: volume},
    timeout=900, # 15 mins
    secrets=([
        Secret.from_name("hf-token")
    ])
)
async def transcribe_video(id: str, src: str):
    from retake.sage.core import transcribe_video
    return transcribe_video(id, src)


@stub.function(
    network_file_systems={BASE_DIR: volume},
    timeout=600, # 10 mins
    secrets=([
        Secret.from_name("hf-token"),
        Secret.from_name("openai-secret")
    ])
)
async def get_highlights(id: str, title: str):
    from retake.sage.core import get_highlights
    return get_highlights(id, title)


@stub.function(
    image=deepface_image,
    cpu=4,
    gpu="T4",
    network_file_systems={BASE_DIR: volume},
    timeout=600, # 10 mins
    secrets=([
        Secret.from_name("hf-token"),
        Secret.from_name("openai-secret")
    ])
)
async def generate_clip(id: str, segment: Segment):
    from datetime import timedelta
    from retake.sage.core import generate_clips

    print(f"Generating clips for video '{id}'. Segment: {segment.title} ({timedelta(seconds=segment.duration)}).")
    
    return generate_clips(id, [segment])


@stub.function(
    network_file_systems={BASE_DIR: volume},
    timeout=3600, # 1h
    secrets=([
        Secret.from_name("aws-modal")
    ])
)
async def process_video(id: str, src: Source, title: str, webhook_endpoint: Optional[str], max_len_mins: Optional[int]):
    import requests
    from .types import VideoResult, FailureReason
    from modal.functions import gather
    from dataclasses import asdict
    from retake.sage.video import from_source

    file_path = get_video_file(id, src)

    v = from_source(file_path)
    if max_len_mins and (v.duration_ms / 1000) > max_len_mins:
        result = VideoResult(id, src, [], FailureReason.TOO_LONG)

        if webhook_endpoint:
            requests.post(webhook_endpoint, asdict(result))

        return result

    transcribe_video.call(id, file_path)
    highlights = get_highlights.call(id, title)

    processing = []
    for h in highlights:
        processing.append(generate_clip.spawn(id, h))

    gather(*processing)

    result = compile_result(id)

    if webhook_endpoint:
        try:
            requests.post(webhook_endpoint, asdict(result))
        except Exception as e:
            print(f"process_video: Webhook error: {e}")

    print(f"process_video: Done. Video ID: {id}.")

    return result


def compile_result(id: str) -> VideoResult:
    import json
    from .types import SingleAlignedSegment

    from retake.sage.config import VIDEO_DIR

    video_dir = VIDEO_DIR + f"/{id}"

    video_file = None
    for file in os.listdir(video_dir):
        _, video_ext = os.path.splitext(file)
        if file == ("video" + video_ext):
            video_file = video_dir + f"/{file}"
            break

    if not video_file:
        raise Exception("Video file does not exist.")

    result = VideoResult(
        id=id,
        original_file=Source(
            type=SourceType.S3,
            uri=video_file.lstrip(BASE_DIR)
        ),
        clips=[],
        reason=None
    )

    speech_segments: list[SingleAlignedSegment] = []

    with open(video_dir + f"/speech_data.json", "r") as f:
        j = json.loads(f.read())
        for s in j["segments"]:
            speech_segments.append(SingleAlignedSegment(s))

    f = open(video_dir + f"/highlights.json", "r")

    for h in json.loads(f.read()):
        clip_id = 0
        s = Segment.from_dict(h)
        for ts in s.timeranges:
            clip_id += int(ts[0] + ts[1])

        clip_name = f"clip_{clip_id}"

        clip = Clip(
            id=clip_id,
            title=s.title,
            duration=s.duration,
            timeranges=s.timeranges,
            file=Source(
                type=SourceType.S3,
                uri=f"/videos/{clip_name}.mp4"
            ),
            preview_file=Source(
                type=SourceType.S3,
                uri=f"/videos/{clip_name}_preview.mp4"
            ),
            frame_data=[],
            speech_data=[]
        )

        clip_length = 0

        for ts in s.timeranges:
            for ss in speech_segments:
                ss_start, ss_end = ss["start"], ss["end"]
                if ss_start >= ts[0] and ss_end <= ts[1]: 
                    ss["start"] = round(clip_length + (ss_start - ts[0]), 3)
                    ss["end"] = round(clip_length + (ss_end - ts[0]), 3)

                    # Some words don't have a start/end time.
                    # If such cases, use the same timestamps as the last word.
                    last_start, last_end = ss_start, ss_start

                    for word in ss["words"]:
                        start = word.get("start", last_start)
                        end = word.get("end", last_end)

                        last_start = start
                        last_end = end

                        word["start"] = round((start - ss_start) + ss["start"], 3)
                        word["end"] = round((end - ss_start) + ss["start"], 3)

                    clip.speech_data.append(ss)
                elif ss["start"] > ts[1]:
                    break

            clip_length += ts[1] - ts[0]

        frame_data_file = open(video_dir + f"/clip_{clip_id}.json", "r")

        for v in json.loads(frame_data_file.read()):
            frame = FrameData.from_dict(v)
            clip.frame_data.append(frame)

        frame_data_file.close()

        result.clips.append(clip)

    f.close()

    return result


def save_job(call_id: str) -> Job:
    jobs = container_app["jobs"]

    job = Job(
        id=call_id,
        result=None,
        completed=False,
        created_at=datetime.now(timezone.utc)
    )

    cast(Dict, jobs)[call_id] = job

    return job


def get_children(i: InputInfo) -> list[InputInfo]:
    nodes = []
    for c in i.children:
        nodes.append(c)
        nodes.extend(get_children(c))
    return nodes


def job_status(call_id: str) -> Job:
    job: Optional[Job] = cast(Dict, container_app["jobs"])[call_id]
    if job and job.completed:
        return job

    from modal.functions import FunctionCall

    try:
        call = FunctionCall.from_id(call_id)

        try:
            result = call.get(timeout=0.1)

            created_at = getattr(job, "created_at", None)

            job = Job(
                id=call_id,
                result=result,
                completed=False,
                created_at=created_at
            )

            graph = call.get_call_graph()

            try:
                tasks = get_children(graph[0])
                done = sum(1 for t in tasks if t.status == InputStatus.SUCCESS)
                job.completed = done >= len(tasks)
            except IndexError:
                pass

            cast(Dict, container_app["jobs"])[call_id] = job

            return job
        except TimeoutError:
            pass
    except:
        pass

    if job: return job

    return Job(
        id="not_found",
        result=None,
        completed=False,
        created_at=None
    )
