# SynqX Project Context

## Project Overview
**SynqX** is a Universal ETL Orchestrator designed to simplify complex data workflows by treating pipelines as versioned, immutable logic objects. It features a decoupled architecture separating the **Control Plane** (UI, API) from the **Data Plane** (Workers, Remote Agents).

### Architecture
-   **Control Plane:**
    -   **UI:** React-based Console (Frontend).
    -   **API:** FastAPI Gateway (Backend).
    -   **DB:** PostgreSQL (Metadata & State).
-   **Data Plane:**
    -   **Broker:** Redis (Task Queue).
    -   **Workers:** Celery Cluster (Local execution).
    -   **Agents:** Portable Python binaries for remote execution in isolated environments.

## Tech Stack

### Backend (`/backend`)
-   **Language:** Python 3.13+
-   **Framework:** FastAPI
-   **ORM:** SQLAlchemy 2.0+
-   **Migrations:** Alembic
-   **Task Queue:** Celery with Redis
-   **Package Manager:** `uv`
-   **Key Deps:** `synqx-core`, `synqx-engine`, `pydantic`, `structlog`.

### Frontend (`/frontend`)
-   **Framework:** React 19
-   **Build Tool:** Vite
-   **Styling:** TailwindCSS v4, shadcn/ui
-   **State Management:** Zustand, React Query
-   **Language:** TypeScript
-   **Visualization:** Mermaid.js, Recharts, React Flow (@xyflow/react)

### Agent (`/agent`)
-   **Type:** Standalone Python Application
-   **Purpose:** Remote execution unit.
-   **Capabilities:** Connects to diverse data sources (SQL, NoSQL, Cloud Storage, SaaS).
-   **Distribution:** Built as a portable tarball via `scripts/synqx.py`.

### Shared Libraries (`/libs`)
-   **`synqx-core`:** Core data structures and utilities.
-   **`synqx-engine`:** Execution engine logic shared between Backend and Agent.

## Development Workflow

The project uses a unified CLI script `scripts/synqx.py` for all lifecycle management tasks.

### Key Commands
| Command | Description |
| :--- | :--- |
| `./scripts/synqx.py install` | Install all dependencies (Backend, Frontend, Agent, Libs). |
| `./scripts/synqx.py start` | Start the full stack (API, Worker, Frontend). Use `--agent` to include local agent. |
| `./scripts/synqx.py status` | Check status of running services. |
| `./scripts/synqx.py stop` | Stop all services. |
| `./scripts/synqx.py logs [service]` | Tail logs for `api`, `worker`, or `agent`. |
| `./scripts/synqx.py db migrate` | Apply database migrations. |
| `./scripts/synqx.py db revision -m "msg"` | Create a new migration revision. |
| `./scripts/synqx.py build agent` | Build the portable agent artifact. |

### Configuration
-   **Global:** `synqx.config.json` (Ports, Logging, Build settings).
-   **Env:** `.env` files are typically used within subdirectories (managed by `uv` / `dotenv`).

## Directory Structure
-   `backend/`: FastAPI application source.
-   `frontend/`: React application source.
-   `agent/`: Agent source code.
-   `libs/`: Internal shared libraries.
-   `scripts/`: Management scripts (DevOps/CI).
-   `.synqx/`: Local runtime directory (PID files, logs, backups).
-   `dist_agent/`: Output directory for agent builds.

## Conventions
-   **Monorepo:** Uses internal path dependencies (`../libs/synqx-core`).
-   **Versioning:** Managed via `scripts/synqx.py release bump`.
-   **Strict Typing:** Python code uses type hints; Frontend uses TypeScript.
-   **Migration Safety:** Backups are recommended/automated before migrations.
