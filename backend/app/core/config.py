from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SynqX ETL Agent"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    DATABASE_URL: str
    API_V1_STR: str = "/api/v1"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]

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

    REDIS_URL: str = "redis://localhost:6379/0"

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
    OIDC_DISCOVERY_URL: str = ""  # e.g. https://accounts.google.com/.well-known/openid-configuration
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()