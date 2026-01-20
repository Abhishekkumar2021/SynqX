# Local Development Setup Guide

This guide walks you through setting up the SynqX monorepo for local development using the unified `synqx.py` CLI.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

1.  **Python 3.13+** (Managed via `uv` recommended)
2.  **Node.js 20+** (with `npm`)
3.  **PostgreSQL 15+** (Running locally)
4.  **Redis 7+** (Running locally)
5.  **uv** (Fast Python package manager): `pip install uv`

---

## 🛠️ Step 1: Initialization

The `setup` command handles all virtual environment creation, internal library linking, and dependency installation across the monorepo.

```bash
# From the project root
./scripts/synqx.py setup
```

This command will:
*   Create `.venv` in `backend/` and `agent/`.
*   Install `libs/synqx-core` and `libs/synqx-engine` in editable mode.
*   Install all `pip` and `npm` dependencies.

---

## ⚙️ Step 2: Environment Configuration

Create your local `.env` files using the provided examples.

### Backend
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and update your database credentials:
```env
DATABASE_HOST="localhost"
DATABASE_USERNAME="your_user"
DATABASE_PASSWORD="your_password"
```

### Frontend
```bash
cp frontend/.env.example frontend/.env
```

---

## 🗄️ Step 3: Database Migrations

Initialize your local database schema using the CLI:

```bash
./scripts/synqx.py db migrate
```

---

## 🚀 Step 4: Running the Stack

You can start the core services (API, Worker, Beat, Frontend) with one command:

```bash
./scripts/synqx.py start
```

### Options:
*   **Include Agent:** `./scripts/synqx.py start --agent`
*   **Debug Logs:** Use `./scripts/synqx.py logs [service]` (e.g., `api`, `worker`, `frontend`) in a separate terminal.

---

## 🛠️ Common Management Commands

| Action | Command |
| :--- | :--- |
| **Check Status** | `./scripts/synqx.py status` |
| **Check Health** | `./scripts/synqx.py health` |
| **Stop All** | `./scripts/synqx.py stop` |
| **Restart** | `./scripts/synqx.py restart` |
| **Clean Build Files** | `./scripts/synqx.py clean` |
| **New Migration** | `./scripts/synqx.py db revision -m "description"` |

---

## 💡 Troubleshooting

*   **Port Conflicts:** If port 8000 (API) or 5173 (Frontend) is taken, the CLI will attempt to evict the existing process. You can change ports in `synqx.config.json`.
*   **Missing Dependencies:** If a command fails, try running `./scripts/synqx.py setup` again to refresh environments.
*   **Log Files:** All service output is piped to `.synqx/logs/`. Check these if a service fails to start.
