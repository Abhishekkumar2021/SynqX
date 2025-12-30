# SynqX - Production-Grade ETL Orchestration Engine

SynqX is a high-performance, distributed ETL engine designed for modern data stacks. It formalizes data movement as versioned, immutable Directed Acyclic Graphs (DAGs) and provides deep observability through real-time forensic telemetry.

## 🏗️ Core Architecture

The backend is partitioned into a high-availability **Control Plane** and a scalable **Data Plane**.

### 1. Orchestration Layer (FastAPI)
- **State Management**: Orchestrates the lifecycle of pipelines, jobs, and granular step metrics.
- **DAG Compiler**: Validates structural integrity and calculates optimal parallel execution layers.
- **Real-time Gateway**: Streams execution logs and telemetry via high-speed WebSocket channels.

### 2. The Vault (Security)
- **AES-256 Encryption**: All credentials and sensitive connection parameters are encrypted at rest using Fernet symmetric encryption.
- **Zero-Exposure Keys**: Decryption occurs only in RAM within the worker process during active execution.

### 3. Execution Runtime (Celery + Redis)
- **Distributed Workers**: Stateless nodes that pick up enqueued tasks from a Redis message broker.
- **Streaming Architecture**: Utilizes Python generator-based streaming to process gigabytes of data with a constant memory footprint.
- **Managed State**: Automatic high-watermark tracking for reliable incremental synchronization.

## 🔌 Connectivity & Assets

SynqX abstracts physical systems into logical **Assets** with a standardized naming convention:
- **Friendly Name**: A human-readable label for the UI.
- **Fully Qualified Name (FQN)**: The technical identifier or path (e.g., `schema.table` for SQL, `/api/v1/resource` for REST, or `prefix/key.csv` for S3).

### Supported Connectors
- **Relational**: PostgreSQL, MySQL, SQL Server, Snowflake, BigQuery.
- **APIs**: Generic REST (with adaptive pagination and data-key overrides).
- **Storage**: S3, Local Filesystem (CSV, Parquet, JSONL).
- **NoSQL**: MongoDB, Redis.

## 🛠️ Technical Setup

### Prerequisites
- **Python**: 3.13+
- **Infrastructure**: PostgreSQL 17+, Redis 7.4+, Celery 5.3+

### Installation
1. Initialize virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Configure `.env` based on `.env.example`.
3. Start the services:
   ```bash
   # API Server
   uvicorn main:app --reload
   
   # Worker
   celery -A app.core.celery_app worker --loglevel=info
   
   # Scheduler
   celery -A app.core.celery_app beat --loglevel=info
   ```

## 🧪 Testing & Quality
Run the comprehensive test suite to verify connectivity and transform logic:
```bash
pytest
```