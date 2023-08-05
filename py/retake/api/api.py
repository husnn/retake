from dataclasses import asdict
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from retake.api.types import Source

app = FastAPI()


class VideoInfoRequest(BaseModel):
    id: str
    src: Source


class ProcessRequest(BaseModel):
    id: str
    src: Source
    title: str
    webhook_endpoint: Optional[str]


@app.get("/api/status/{job_id}")
async def job_status(job_id: str):
    from retake.api.main import job_status
    job = job_status(job_id)
    return success(asdict(job))


@app.post("/api/video_info")
async def get_video_info(req: VideoInfoRequest):
    from retake.api.main import get_video
    v = get_video.call(req.id, req.src)
    return success(asdict(v))


@app.post("/api/process")
async def process(req: ProcessRequest):
    import uuid
    from retake.api.main import process_video, save_job

    job_id = uuid.uuid1().hex

    call = process_video.spawn(req.id, req.src, req.title, job_id, req.webhook_endpoint)
    if not call: return error(None)

    job = save_job(job_id, call.object_id)

    return success({
        "job": asdict(job)
    })


def success(res: dict):
    return { "success": True } | res


def error(msg: Optional[str]):
    if not msg:
        msg = "An unexpected error occurred."
        
    return {
        "success": False,
        "error": msg
    }
