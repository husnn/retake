from dataclasses import asdict
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from retake.api.types import Source

app = FastAPI()


class TranscribeRequest(BaseModel):
    id: str
    src: Source


class ProcessRequest(BaseModel):
    id: str
    src: Source
    title: str
    webhook_endpoint: Optional[str]
    mins_available: Optional[int]


@app.post("/api/transcribe")
async def transcribe_video(req: TranscribeRequest):
    from retake.api.main import transcribe_video, save_job

    call = transcribe_video.spawn(req.id, req.src)
    if not call: return error(None)

    job = save_job(call.object_id)

    return success({
        "job": asdict(job)
    })


@app.get("/api/status/{job_id}")
async def transcribe_status(job_id: str):
    from retake.api.main import job_status
    return success(asdict(job_status(job_id)))


@app.post("/api/process")
async def process(req: ProcessRequest):
    from retake.api.main import process_video, save_job

    call = process_video.spawn(req.id, req.src, req.title, req.webhook_endpoint, req.mins_available)
    if not call: return error(None)

    job = save_job(call.object_id)

    return success({
        "job": asdict(job)
    })


@app.get("/api/results/{id}")
async def result(id: str):
    from retake.api.main import compile_result

    result = compile_result(id)

    return success(asdict(result))


def success(res: dict):
    return { "success": True } | res


def error(msg: Optional[str]):
    if not msg:
        msg = "An unexpected error occurred."
        
    return {
        "success": False,
        "error": msg
    }
