from fastapi import APIRouter, WebSocket

from app.core.websockets import manager

router = APIRouter()


@router.websocket("/ws/jobs/{job_id}")
async def websocket_job_logs(websocket: WebSocket, job_id: int):
    """
    WebSocket endpoint to stream real-time logs for a specific Job.
    """
    await manager.connect_and_stream(websocket, f"job:{job_id}")


@router.websocket("/ws/job_telemetry/{job_id}")
async def websocket_job_telemetry(websocket: WebSocket, job_id: int):
    """
    WebSocket endpoint to stream real-time telemetry (progress, stats) for a specific Job.
    """  # noqa: E501
    await manager.connect_and_stream(websocket, f"job_telemetry:{job_id}")


@router.websocket("/ws/jobs_list")
async def websocket_jobs_list(websocket: WebSocket):
    """
    WebSocket endpoint to receive notifications when the global jobs list needs refreshing.
    """  # noqa: E501
    await manager.connect_and_stream(websocket, "jobs_list")


@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket endpoint to receive notifications when the dashboard stats need refreshing.
    """  # noqa: E501
    await manager.connect_and_stream(websocket, "dashboard")


@router.websocket("/ws/steps/{step_run_id}")
async def websocket_step_logs(websocket: WebSocket, step_run_id: int):
    """
    WebSocket endpoint to stream real-time logs for a specific Step Run.
    """
    await manager.connect_and_stream(websocket, f"step:{step_run_id}")


@router.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    """
    WebSocket endpoint to stream real-time notifications for a specific User.
    """
    await manager.connect_and_stream(websocket, f"user_notifications:{user_id}")


@router.websocket("/ws/notifications/workspace/{workspace_id}")
async def websocket_workspace_notifications(websocket: WebSocket, workspace_id: int):
    """
    WebSocket endpoint to stream real-time notifications for a specific Workspace.
    """
    await manager.connect_and_stream(
        websocket, f"workspace_notifications:{workspace_id}"
    )
