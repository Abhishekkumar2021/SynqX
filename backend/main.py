import time
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.core.logging import setup_logging, get_logger
from app.middlewares.correlation import CorrelationMiddleware
from app.models import Base
from app.api.v1.api import api_router
from app.core.errors import AppError, NotFoundError, ForbiddenError
import synqx_engine.connectors.impl  # Register connectors
import synqx_engine.transforms.impl  # Register transforms

setup_logging()
logger = get_logger("main")


def init_database() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("database_ready")
    except Exception as exc:
        logger.critical("database_init_failed", error=str(exc), exc_info=True)
        raise


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    start = time.perf_counter()
    logger.info(
        "application_starting", environment=settings.ENVIRONMENT, app=settings.APP_NAME
    )
    try:
        init_database()
        logger.info(
            "application_ready", startup_seconds=round(time.perf_counter() - start, 3)
        )
    except Exception as exc:
        logger.critical("startup_failed", error=str(exc), exc_info=True)
        raise
    yield
    logger.info("application_stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Universal ETL Engine",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.add_middleware(CorrelationMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    for error in errors:
        # Remove 'ctx' which may contain non-serializable objects (like Exceptions)
        error.pop("ctx", None)
        
        # Ensure 'url' is serializable if present
        if "url" in error:
            error["url"] = str(error["url"])

        if "input" in error and isinstance(error["input"], bytes):
            try:
                error["input"] = error["input"].decode("utf-8")
            except Exception:
                error["input"] = str(error["input"])
    
    logger.warning("validation_error", errors=errors, path=request.url.path)
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(status_code=403, content={"detail": str(exc)})


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    logger.warning("app_error", error=str(exc))
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_error", error=str(exc), exc_info=True)
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.get("/", tags=["System"])
async def root():
    return {"app": settings.APP_NAME, "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["System"])
async def health() -> Dict[str, Any]:
    result = {"status": "healthy", "database": "unknown"}
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        result["database"] = "up"
    except Exception as exc:
        result["status"] = "degraded"
        result["database"] = f"down: {exc}"
        logger.error("health_db_failed", error=str(exc))
    return result


app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
    )
