"""
Celery Distributed Worker Configuration for CRISP AI 3.0 Enterprise
Provides asynchronous background job dispatch backed by Redis broker
for high-throughput, multi-worker distributed causal analytics.
"""

import os
import logging
from celery import Celery
from app.core.config import settings

logger = logging.getLogger("crisp_celery")

# Broker and result backend from settings
REDIS_URL = settings.REDIS_URL or "redis://localhost:6379/0"

celery_app = Celery(
    "crisp_enterprise_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600, # 1 hour max for huge causal graphs
    worker_concurrency=settings.WORKER_CONCURRENCY,
    worker_prefetch_multiplier=1
)


@celery_app.task(name="execute_causal_task", bind=True)
def execute_causal_task(self, job_id: str, analysis_id: int, config_dict: dict, user_id: int, workspace_id: int):
    """
    Celery background worker task for running scientific causal analysis.
    Synchronizes status to DB entities (QUEUED -> RUNNING -> COMPLETED / FAILED).
    """
    from app.core.job_queue import job_manager
    logger.info(f"Celery worker picked up causal analysis job: {job_id}")
    job_manager._worker_execute(
        job_id=job_id,
        analysis_id=analysis_id,
        config_dict=config_dict,
        user_id=user_id,
        workspace_id=workspace_id
    )
    return {"status": "SUCCESS", "job_id": job_id, "analysis_id": analysis_id}
