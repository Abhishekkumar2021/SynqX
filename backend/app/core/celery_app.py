from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "synqx_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    beat_schedule={
        "scheduler-heartbeat": {
            "task": "app.worker.tasks.scheduler_heartbeat",
            "schedule": 60.0,
        }
    },
)