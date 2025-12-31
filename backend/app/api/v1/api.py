from fastapi import APIRouter

from app.api.v1.endpoints import pipelines, connections, jobs, websockets, auth, api_keys, alerts, dashboard, explorer, files, workspaces, audit

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(connections.router, prefix="/connections", tags=["connections & assets"])
api_router.include_router(files.router, prefix="/files", tags=["live file management"])
api_router.include_router(explorer.router, prefix="/explorer", tags=["data exploration"])
api_router.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
api_router.include_router(jobs.router, prefix="", tags=["jobs & runs"])
api_router.include_router(websockets.router, tags=["websockets"])