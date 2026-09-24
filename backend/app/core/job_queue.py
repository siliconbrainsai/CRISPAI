"""
Distributed Job Processing Subsystem for CRISP AI 3.0 Enterprise
Manages persistent analysis execution lifecycle with real status updates:
QUEUED -> RUNNING -> COMPLETED | FAILED | CANCELLED | RETRY.
Maintains DB persistence, audit logging on failure, and avoids fake result fallbacks.
Supports multi-worker thread execution locally and Celery/Redis queue abstraction.
"""

import uuid
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from enum import Enum
from typing import Dict, Any, Optional

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.db.entities import Analysis, AuditLog

logger = logging.getLogger("crisp_jobs")


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    RETRY = "RETRY"


class JobQueueManager:
    """
    Persistent Job Queue Manager.
    Executes causal pipeline jobs asynchronously, synchronizing state directly
    to the database entity so jobs survive restarts and provide true observability.
    """

    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="crisp_worker")
        self.active_jobs: Dict[str, Dict[str, Any]] = {}

    def enqueue_pipeline_job(
        self,
        analysis_id: Optional[int],
        config_dict: Dict[str, Any],
        user_id: Optional[int] = None,
        workspace_id: Optional[int] = None
    ) -> str:
        """
        Enqueues an analysis job for execution.
        Updates DB entity to QUEUED and submits to background thread pool.
        """
        job_id = str(uuid.uuid4())
        
        # 1. Update Database Analysis record if analysis_id provided
        if analysis_id:
            db = SessionLocal()
            try:
                analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
                if analysis:
                    analysis.status = JobStatus.QUEUED.value
                    analysis.job_id = job_id
                    analysis.error_message = None
                    if workspace_id:
                        analysis.workspace_id = workspace_id
                    if user_id:
                        analysis.created_by_user_id = user_id
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to set QUEUED status for analysis {analysis_id}: {e}")
                db.rollback()
            finally:
                db.close()

        # 2. Track in active job registry
        self.active_jobs[job_id] = {
            "job_id": job_id,
            "analysis_id": analysis_id,
            "status": JobStatus.QUEUED.value,
            "progress": 0,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
            "config": config_dict
        }

        # 3. Submit to Celery if REDIS_URL configured, otherwise fallback to local executor
        dispatched_via_celery = False
        if settings.REDIS_URL:
            try:
                from app.core.celery_app import execute_causal_task
                execute_causal_task.delay(job_id, analysis_id, config_dict, user_id, workspace_id)
                dispatched_via_celery = True
                logger.info(f"Dispatched job {job_id} to Celery/Redis broker.")
            except Exception as cel_err:
                logger.warning(f"Failed to dispatch to Celery ({cel_err}). Falling back to local thread worker.")

        if not dispatched_via_celery:
            self.executor.submit(self._worker_execute, job_id, analysis_id, config_dict, user_id, workspace_id)

        return job_id

    def _worker_execute(
        self,
        job_id: str,
        analysis_id: Optional[int],
        config_dict: Dict[str, Any],
        user_id: Optional[int],
        workspace_id: Optional[int]
    ):
        """Worker execution function running in thread pool."""
        from app.causal_engine.pipeline_runner import run_scientific_analysis

        # Mark RUNNING in memory
        if job_id in self.active_jobs:
            self.active_jobs[job_id]["status"] = JobStatus.RUNNING.value
            self.active_jobs[job_id]["progress"] = 20

        # Mark RUNNING in DB
        db = SessionLocal()
        try:
            if analysis_id:
                analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
                if analysis:
                    if analysis.status == JobStatus.CANCELLED.value:
                        logger.info(f"Job {job_id} was cancelled before execution.")
                        return
                    analysis.status = JobStatus.RUNNING.value
                    db.commit()
        except Exception as e:
            logger.error(f"Error updating RUNNING status for {job_id}: {e}")
            db.rollback()
        finally:
            db.close()

        # Execute real scientific analysis
        try:
            raw_envs = config_dict.get("environments")
            if raw_envs is not None:
                env_list = raw_envs
            else:
                env_list = config_dict.get("environment_keys") or []
            results = run_scientific_analysis(
                job_id=job_id,
                dataset_id=config_dict.get("dataset_id"),
                file_path=config_dict.get("file_path"),
                outcome=config_dict.get("outcome"),
                candidates=config_dict.get("candidates"),
                environments=env_list,
                alpha=config_dict.get("alpha", 0.05),
                seed=config_dict.get("seed", 42),
                analysis_id=analysis_id
            )

            # Mark COMPLETED in memory
            if job_id in self.active_jobs:
                self.active_jobs[job_id]["status"] = JobStatus.COMPLETED.value
                self.active_jobs[job_id]["progress"] = 100
                self.active_jobs[job_id]["results"] = results

            # Mark COMPLETED in DB
            db = SessionLocal()
            try:
                if analysis_id:
                    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
                    if analysis:
                        analysis.status = JobStatus.COMPLETED.value
                        analysis.error_message = None
                        db.commit()
            except Exception as e:
                logger.error(f"Error updating COMPLETED status in DB for {job_id}: {e}")
                db.rollback()
            finally:
                db.close()

        except Exception as exc:
            error_text = str(exc)
            logger.exception(f"Scientific analysis job {job_id} failed: {error_text}")

            # Mark FAILED in memory
            if job_id in self.active_jobs:
                self.active_jobs[job_id]["status"] = JobStatus.FAILED.value
                self.active_jobs[job_id]["progress"] = 0
                self.active_jobs[job_id]["error"] = error_text

            # Mark FAILED in DB and log to audit table
            db = SessionLocal()
            try:
                if analysis_id:
                    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
                    if analysis:
                        analysis.status = JobStatus.FAILED.value
                        analysis.error_message = error_text
                        db.commit()

                # Enterprise Audit Log for job failure
                audit = AuditLog(
                    workspace_id=workspace_id or 1,
                    user_id=user_id,
                    action="ANALYSIS_FAILED",
                    resource="analysis",
                    resource_id=str(analysis_id or job_id),
                    details=f"Job {job_id} failed: {error_text[:250]}"
                )
                db.add(audit)
                db.commit()
            except Exception as dbe:
                logger.error(f"Error persisting failure state for {job_id}: {dbe}")
                db.rollback()
            finally:
                db.close()

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Retrieves status from memory or persistent database.
        """
        if job_id in self.active_jobs:
            info = self.active_jobs[job_id]
            return {
                "job_id": job_id,
                "status": info["status"],
                "progress": info.get("progress", 0),
                "error": info.get("error")
            }

        # Query database by job_id or analysis_id
        db = SessionLocal()
        try:
            analysis = db.query(Analysis).filter(
                (Analysis.job_id == job_id) | (Analysis.id == int(job_id) if job_id.isdigit() else False)
            ).first()
            if analysis:
                progress = 100 if analysis.status == JobStatus.COMPLETED.value else (20 if analysis.status == JobStatus.RUNNING.value else 0)
                return {
                    "job_id": analysis.job_id or str(analysis.id),
                    "analysis_id": analysis.id,
                    "status": analysis.status,
                    "progress": progress,
                    "error": analysis.error_message
                }
        except Exception:
            pass
        finally:
            db.close()

        return {"job_id": job_id, "status": "NOT_FOUND"}

    def cancel_job(self, job_id: str, user_id: Optional[int] = None) -> bool:
        """Cancels a job and updates its status to CANCELLED."""
        db = SessionLocal()
        try:
            analysis = db.query(Analysis).filter(Analysis.job_id == job_id).first()
            if analysis and analysis.status in [JobStatus.QUEUED.value, JobStatus.RUNNING.value]:
                analysis.status = JobStatus.CANCELLED.value
                db.commit()
                if job_id in self.active_jobs:
                    self.active_jobs[job_id]["status"] = JobStatus.CANCELLED.value
                return True
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {e}")
            db.rollback()
        finally:
            db.close()
        return False

    def retry_job(self, analysis_id: int, user_id: Optional[int] = None) -> Optional[str]:
        """
        Retries a failed analysis, incrementing retry_count.
        """
        db = SessionLocal()
        try:
            analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
            if not analysis:
                return None

            analysis.retry_count = (analysis.retry_count or 0) + 1
            analysis.status = JobStatus.RETRY.value
            analysis.error_message = None
            db.commit()

            # Reconstruct config
            config_dict = {
                "dataset_id": analysis.dataset_id,
                "analysis_id": analysis.id,
                "outcome": analysis.outcome,
                "candidates": analysis.candidates,
                "environments": analysis.environments,
                "models": ["IRM", "ICP", "PC", "RF"],
                "alpha": 0.05,
                "seed": 42
            }
            new_job_id = self.enqueue_pipeline_job(
                analysis_id=analysis.id,
                config_dict=config_dict,
                user_id=user_id or analysis.created_by_user_id,
                workspace_id=analysis.workspace_id
            )
            return new_job_id
        except Exception as e:
            logger.error(f"Failed to retry analysis {analysis_id}: {e}")
            db.rollback()
            return None
        finally:
            db.close()


# Global Singleton instance
job_manager = JobQueueManager(max_workers=settings.WORKER_CONCURRENCY)
