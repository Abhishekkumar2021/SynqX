# SynqX - The Universal ETL Engine

![SynqX Banner](https://img.shields.io/badge/SynqX-Universal_ETL_Orchestrator-blueviolet?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-FastAPI_%7C_Celery-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_%7C_Tailwind-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**SynqX** is an open-source, production-ready platform designed to simplify the orchestration of complex data workflows. By treating pipelines as **versioned, immutable logic objects** and providing deep, **real-time observability**, SynqX ensures data reliability at scale.

## 🌟 Mission

To eliminate the "Black Box" nature of traditional ETL. SynqX provides engineers with high-fidelity visibility into their data's journey—from extraction to destination—transforming fragile scripts into robust, observable engineering assets.

---

## 🏗️ System Architecture

SynqX employs a decoupled, event-driven architecture designed for high availability and horizontal scalability.

```mermaid
graph TD
    subgraph "Control Plane"
        UI[Console UI (React)] <--> API[API Gateway (FastAPI)]
        API <--> DB[(PostgreSQL)]
    end

    subgraph "Data Plane"
        API -- "Tasks & Config" --> Redis[(Redis Broker)]
        Redis -- "Stream" --> Worker[Celery Worker Cluster]
        Worker -- "Status & Logs" --> Redis
        Beat[Celery Beat] -- "Schedules" --> Redis
    end

    subgraph "External Systems"
        Worker -- "Extract" --> Source[(Sources: SQL/API/S3)]
        Worker -- "Load" --> Dest[(Destinations: DW/Lake)]
    end
```

---

## 🚀 Key Features

### 🧠 Intelligent Orchestration
*   **Immutable Pipelines**: Every change to a pipeline creates a new immutable version. Instantly rollback to any previous snapshot if a production run fails.
*   **Visual DAG Editor**: Design complex dependency graphs with a drag-and-drop interface powered by React Flow.
*   **Smart Scheduling**: Integrated Cron-based scheduling with timezone awareness and catch-up policies.

### 🔍 Deep Forensics & Observability
*   **Real-time Telemetry**: Watch execution logs stream live via WebSockets as they happen.
*   **Data Sniffing**: Inspect sample data snapshots at *each node boundary* to identify transformation bugs before they propagate.
*   **Metric Tracking**: detailed CPU, memory, and duration metrics for every step of the pipeline.

### 🔌 Universal Connectivity
*   **Standardized Assets**: Abstracts physical systems (SQL tables, S3 files, API endpoints) into logical "Assets" with a unified naming convention.
*   **Broad Support**:
    *   **Relational**: PostgreSQL, MySQL, SQL Server, Snowflake, BigQuery.
    *   **Files**: S3, Local Filesystem (CSV, Parquet, JSONL), Azure Blob, GCS.
    *   **APIs**: Generic REST connectors with adaptive pagination.
    *   **NoSQL**: MongoDB, Redis.

### 🛡️ Enterprise-Grade Security
*   **The Vault**: Application-layer AES-256 encryption ensures credentials never leak, even if the underlying database is compromised.
*   **Zero-Exposure**: Decryption occurs only in volatile memory within the worker process during active execution.

---

## ⚡ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend API** | Python, FastAPI | High-performance async REST API. |
| **Worker Engine** | Celery | Distributed task queue for executing ETL jobs. |
| **Broker/Cache** | Redis | Message broker for task queues and real-time pub/sub. |
| **Database** | PostgreSQL | Primary persistent store for metadata and execution history. |
| **Frontend** | React, Vite | Modern SPA with TypeScript and Tailwind CSS. |
| **Visualization** | React Flow | Interactive node-based graph editor. |

---

## 🏁 Quick Start

The easiest way to get started is using the unified management script, which handles environment checks and service orchestration.

### Prerequisites
*   **Docker & Docker Compose** (Recommended)
*   *Or for local dev:* Python 3.13+, Node.js 18+, PostgreSQL 15+, Redis 7+

### One-Command Launch (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/synqx.git
cd synqx

# 2. Check environment readiness
./scripts/synqx.sh doctor

# 3. Start the entire stack
./scripts/synqx.sh start
```

*The UI will be available at `http://localhost:5173` and the API docs at `http://localhost:8000/docs`.*

### Manual Local Setup

If you prefer running services directly on your machine:

**1. Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Update .env with your local DB credentials
uvicorn main:app --reload
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev
```

**3. Workers**
```bash
# In a new terminal (from backend dir)
celery -A app.core.celery_app worker --loglevel=info
```

---

## 📂 Project Structure

| Module | Description | Path |
| :--- | :--- | :--- |
| **Backend** | Python/FastAPI engine, Celery worker cluster, and Vault security service. | [`/backend`](./backend) |
| **Frontend** | Premium React-based Console UI with a visual DAG editor. | [`/frontend`](./frontend) |
| **Helm Charts** | Kubernetes deployment manifests for production. | [`/helm`](./helm) |
| **Scripts** | Unified lifecycle management scripts for local development. | [`/scripts`](./scripts) |

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and request features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.