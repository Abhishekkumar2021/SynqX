# SynqX - Production-Grade ETL Orchestration Engine

SynqX is a high-performance, distributed ETL engine designed for modern data stacks. It formalizes data movement as versioned, immutable Directed Acyclic Graphs (DAGs) and provides deep observability through real-time forensic telemetry.

## Core Architecture

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

## Connectivity & Assets

SynqX abstracts physical systems into logical **Assets** with a standardized naming convention:

- **Friendly Name**: A human-readable label for the UI.
- **Fully Qualified Name (FQN)**: The technical identifier or path (e.g., `schema.table` for SQL, `/api/v1/resource` for REST, or `prefix/key.csv` for S3).

### Supported Connectors

- **Relational**: PostgreSQL, MySQL, SQL Server, Oracle, SQLite, DuckDB, Snowflake, BigQuery, Redshift, Databricks.

- **APIs**: Generic REST (with adaptive pagination), GraphQL.

- **Storage**: S3, Local Filesystem, Azure Blob, GCS, FTP, SFTP (supporting CSV, Parquet, JSON, JSONL, TSV, XML, TXT).

- **NoSQL**: MongoDB, Redis, Elasticsearch, Cassandra, DynamoDB.

- **SaaS**: Google Sheets, Airtable, Salesforce, HubSpot, Stripe.

- **Custom**: Extensible via Python, Shell, or JavaScript scripts.

## Technical Setup

### Prerequisites

- **Python**: 3.13+

- **Infrastructure**: PostgreSQL 15+, Redis 7+, Celery 5+

### Installation

1. Initialize virtual environment:

   ```bash

   python -m venv .venv

   source .venv/bin/activate

   ```

2. Install dependencies using `uv`:

   ```bash

   pip install uv

   uv pip install -r requirements.txt

   ```

3. Configure `.env` based on `.env.example`.

4. Start the services:

   ```bash

   # API Server

   uvicorn main:app --reload



   # Worker

   celery -A app.core.celery_app worker --loglevel=info



   # Scheduler

   celery -A app.core.celery_app beat --loglevel=info

   ```

### Admin CLI

The `synqx-admin` CLI is a powerful tool for managing your instance.

```bash

# Get a list of all commands

python -m scripts.synqx_admin --help



# Example: Create a new superuser

python -m scripts.synqx_admin users create --superuser

```

## Testing & Quality

Run the comprehensive test suite to verify connectivity and transform logic:

```bash

pytest

```