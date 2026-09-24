import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.job_queue import job_manager, JobStatus
from app.core.security import get_optional_current_user
from app.models.db.entities import User

logger = logging.getLogger("crisp_pipeline")
router = APIRouter()

# Backwards compatibility alias for active in-memory jobs
jobs = job_manager.active_jobs


class PipelineConfig(BaseModel):
    models: List[str] = ["IRM", "ICP", "PC"]
    alpha: float = 0.05
    environment_keys: Optional[List[str]] = None
    dataset_id: Optional[int] = None
    file_path: Optional[str] = None
    outcome: Optional[str] = None
    candidates: Optional[List[str]] = None
    environments: Optional[List[str]] = None
    analysis_id: Optional[int] = None
    seed: Optional[int] = 42


class JobResponse(BaseModel):
    job_id: str
    status: str
    analysis_id: Optional[int] = None


@router.post("/run", response_model=JobResponse)
async def run_pipeline(
    config: PipelineConfig,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user_id = current_user.id if current_user else None
    workspace_id = current_user.workspace_id if current_user else 1

    config_dict = config.model_dump() if hasattr(config, "model_dump") else config.dict()
    job_id = job_manager.enqueue_pipeline_job(
        analysis_id=config.analysis_id,
        config_dict=config_dict,
        user_id=user_id,
        workspace_id=workspace_id
    )

    return JobResponse(
        job_id=job_id,
        status=JobStatus.QUEUED.value,
        analysis_id=config.analysis_id
    )


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    status_info = job_manager.get_job_status(job_id)
    return status_info


@router.post("/cancel/{job_id}")
async def cancel_pipeline_job(
    job_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user_id = current_user.id if current_user else None
    cancelled = job_manager.cancel_job(job_id, user_id=user_id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Job could not be cancelled or was not found.")
    return {"job_id": job_id, "status": "CANCELLED", "message": "Job successfully cancelled."}


@router.post("/retry/{analysis_id}")
async def retry_pipeline_analysis(
    analysis_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user_id = current_user.id if current_user else None
    new_job_id = job_manager.retry_job(analysis_id, user_id=user_id)
    if not new_job_id:
        raise HTTPException(status_code=404, detail="Analysis not found or could not be retried.")
    return {
        "analysis_id": analysis_id,
        "new_job_id": new_job_id,
        "status": "QUEUED",
        "message": f"Analysis {analysis_id} retried successfully with new job {new_job_id}."
    }
