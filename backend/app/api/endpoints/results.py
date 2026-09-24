from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.db.entities import Analysis
from app.core.job_queue import job_manager, JobStatus

router = APIRouter()

@router.get("/{job_id}")
async def get_results(job_id: str, db: Session = Depends(get_db)):
    # 1. Check in-memory completed jobs from job_manager
    if job_id in job_manager.active_jobs:
        job_data = job_manager.active_jobs[job_id]
        if job_data["status"] == JobStatus.COMPLETED.value and job_data.get("results"):
            return job_data["results"]
        elif job_data["status"] == JobStatus.FAILED.value:
            raise HTTPException(status_code=500, detail=f"Pipeline job failed: {job_data.get('error')}")
        else:
            raise HTTPException(status_code=202, detail=f"Job is still {job_data['status']}")

    # 2. Check persistent database by ID, job_id, or analysis_code
    db_analysis = None
    if job_id.isdigit():
        db_analysis = db.query(Analysis).filter(Analysis.id == int(job_id)).first()
    
    if not db_analysis:
        db_analysis = db.query(Analysis).filter(
            (Analysis.job_id == job_id) | (Analysis.analysis_code == job_id)
        ).first()

    if db_analysis:
        if db_analysis.status == JobStatus.COMPLETED.value and db_analysis.results:
            return db_analysis.results
        elif db_analysis.status == JobStatus.FAILED.value:
            raise HTTPException(status_code=500, detail=f"Pipeline job failed: {db_analysis.error_message}")
        elif db_analysis.status in [JobStatus.RUNNING.value, JobStatus.QUEUED.value, JobStatus.RETRY.value]:
            raise HTTPException(status_code=202, detail=f"Job is still {db_analysis.status}")
        elif db_analysis.results:
            return db_analysis.results

    raise HTTPException(status_code=404, detail=f"Results for job/analysis '{job_id}' not found.")

@router.get("/gradcam/{job_id}/{image_id}")
async def get_gradcam(job_id: str, image_id: str):
    return {
        "job_id": job_id,
        "image_id": image_id,
        "original_image_base64": "base64_string_here",
        "heatmap_base64": "base64_string_here",
        "superimposed_base64": "base64_string_here"
    }
