from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "synqx_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Production Hardening
    task_acks_late=settings.CELERY_TASK_ACKS_LATE,
    worker_prefetch_multiplier=settings.CELERY_WORKER_PREFETCH_MULTIPLIER,
    worker_concurrency=settings.CELERY_WORKER_CONCURRENCY
    if settings.CELERY_WORKER_CONCURRENCY > 0
    else None,
    task_reject_on_worker_lost=True,
    task_send_sent_event=True,
    beat_schedule={
        "scheduler-heartbeat": {
            "task": "app.worker.tasks.scheduler_heartbeat",
            "schedule": 60.0,
        },
        "sla-monitor": {
            "task": "app.worker.tasks.check_sla_breaches",
            "schedule": 300.0,  # Check every 5 minutes
        },
    },
)
