from typing import Any, Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SynqX ETL Agent"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    DATABASE_HOST: str | None = None
    DATABASE_PORT: int = 5432
    DATABASE_USERNAME: str | None = None
    DATABASE_PASSWORD: str | None = None
    DATABASE_NAME: str = "synqx_db"
    DATABASE_URL: str | None = None
    
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_PRE_PING: bool = True
    DB_ECHO: bool = False
    API_V1_STR: str = "/api/v1"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["*"]

    LOG_LEVEL: str = "INFO"

    LOG_CONSOLE_ENABLED: bool = True
    LOG_FILE_ENABLED: bool = False

    LOG_FORMAT: Literal["json", "console"] = "console"

    LOG_FILE_PATH: str = "logs/app.log"
    LOG_FILE_MAX_BYTES: int = 10 * 1024 * 1024  # 10 MB
    LOG_FILE_BACKUP_COUNT: int = 5

    MASTER_PASSWORD: str = "changeme"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    REDIS_HOST: str | None = None
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None
    REDIS_URL: str | None = None

    # Orchestration & Execution
    # Number of parallel worker threads for node execution within a single job
    ENGINE_MAX_WORKERS: int = 0  # 0 means auto-calculate (CPU cores * 2)
    ENGINE_MAX_CACHE_MB: int = 2048

    # Celery Tuning
    CELERY_WORKER_CONCURRENCY: int = 0  # 0 means auto (number of CPUs)
    CELERY_TASK_ACKS_LATE: bool = True
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = 1

    # OIDC / SSO Integration
    OIDC_ENABLED: bool = False
    OIDC_CLIENT_ID: str = ""
    OIDC_CLIENT_SECRET: str = ""
    OIDC_DISCOVERY_URL: str = (
        ""  # e.g. https://accounts.google.com/.well-known/openid-configuration
    )
    OIDC_REDIRECT_URI: str = "http://localhost:3000/callback"
    OIDC_SCOPE: str = "openid email profile"

    # Email / SMTP
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "info@synqx.dev"
    EMAILS_FROM_NAME: str = "SynqX Alerts"

    # AI & Intelligence
    GOOGLE_API_KEY: str = ""
    GOOGLE_AI_MODEL: str = "gemini-3-flash-preview"
    GOOGLE_AI_TEMPERATURE: float = 0.1
    GOOGLE_AI_TOP_P: float = 0.95
    GOOGLE_AI_TOP_K: int = 40
    GOOGLE_AI_MAX_OUTPUT_TOKENS: int = 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @model_validator(mode="before")
    @classmethod
    def assemble_db_connection(cls, values: dict[str, Any]) -> dict[str, Any]:
        if not values.get("DATABASE_URL"):
            host = values.get("DATABASE_HOST")
            port = values.get("DATABASE_PORT", 5432)
            user = values.get("DATABASE_USERNAME")
            password = values.get("DATABASE_PASSWORD")
            name = values.get("DATABASE_NAME", "synqx_db")
            
            if host and user and password:
                values["DATABASE_URL"] = f"postgresql://{user}:{password}@{host}:{port}/{name}"
            elif host: # Fallback for cases without auth or partial
                 values["DATABASE_URL"] = f"postgresql://{host}:{port}/{name}"

        if not values.get("REDIS_URL"):
             host = values.get("REDIS_HOST")
             port = values.get("REDIS_PORT", 6379)
             db = values.get("REDIS_DB", 0)
             password = values.get("REDIS_PASSWORD")
             
             if host:
                 auth = f":{password}@" if password else ""
                 values["REDIS_URL"] = f"redis://{auth}{host}:{port}/{db}"
        
        return values


settings = Settings()
