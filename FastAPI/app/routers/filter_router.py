from fastapi import APIRouter, BackgroundTasks

from app.models.schemas import FilterRequest
from app.services.filter_service import run_filter

router = APIRouter()


@router.post("/filter")
async def request_filter(req: FilterRequest, background_tasks: BackgroundTasks):
    """
    Receives a filter request from Spring Boot.
    Runs in background; calls back /api/callback/filter/{filter_job_id} when done.
    """
    background_tasks.add_task(run_filter, req)
    return {"accepted": True, "filter_job_id": req.filter_job_id}
