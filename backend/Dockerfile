# Stage 1: Builder - Install dependencies and build wheels
FROM python:3.13-slim-bookworm AS builder

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Install uv (or pip if preferred)
RUN pip install uv

# Create app directory
WORKDIR /app

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock ./

# Copy local path dependencies for uv to resolve
# These paths are relative to the project root where `uv` expects them
COPY libs/synqx-core /app/libs/synqx-core
COPY libs/synqx-engine /app/libs/synqx-engine

# Install dependencies using uv
# --system ensures it uses the system site-packages, typically in a slim image this is fine
# --strict ensures all dependencies are resolved from uv.lock
# --offline to ensure reproducible builds if lock file is complete
# --no-build-isolation to use system packages effectively
RUN uv sync --system --strict --offline --no-build-isolation --with=dev

# Stage 2: Runner - Copy only the necessary files for the application
FROM python:3.13-slim-bookworm AS runner

# Set environment variables for production
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
ENV FASTAPI_ENV production
ENV SYNQX_API_V1_STR /api/v1
# Default settings, can be overridden by Kubernetes ConfigMaps/Secrets
ENV DATABASE_URL postgresql://user:password@db:5432/synqx_db
ENV REDIS_URL redis://redis:6379/0
ENV UVICORN_WORKERS 4

# Create app directory
WORKDIR /app

# Copy only installed packages from builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /app/libs/synqx-core /app/libs/synqx-core
COPY --from=builder /app/libs/synqx-engine /app/libs/synqx-engine

# Copy application code
COPY backend/app /app/app
COPY backend/alembic /app/alembic
COPY backend/main.py /app/main.py
COPY backend/alembic.ini /app/alembic.ini

# Expose the port FastAPI runs on
EXPOSE 8000

# Run database migrations before starting the app
# Using an init container in Kubernetes is often preferred for migrations.
# This assumes migrations are idempotent and safe to run on startup.
# For production, consider a separate Kubernetes Job for migrations.
CMD ["/bin/bash", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 --workers $UVICORN_WORKERS"]