#!/usr/bin/env bash
set -Eeuo pipefail

# ====================================================== 
# OS Guard (macOS / Linux)
# ====================================================== 
OS="$(uname -s)"
case "$OS" in
    Darwin|Linux) ;;
    *)
        echo "[ERROR] Unsupported OS: $OS"
        exit 1
        ;;
esac

# ====================================================== 
# Script paths (ABSOLUTE, SAFE)
# ====================================================== 
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ====================================================== 
# Load .env if present
# ====================================================== 
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# ====================================================== 
# Config
# ====================================================== 
API_PORT="${API_PORT:-8000}"
FE_PORT="${FE_PORT:-5173}"

PID_DIR="$PROJECT_ROOT/.synqx"
LOG_DIR="$PROJECT_ROOT/.synqx/logs"

API_PID="$PID_DIR/api.pid"
WORKER_PID="$PID_DIR/worker.pid"
BEAT_PID="$PID_DIR/beat.pid"
FE_PID="$PID_DIR/frontend.pid"

API_LOG="$LOG_DIR/api.log"
WORKER_LOG="$LOG_DIR/worker.log"
BEAT_LOG="$LOG_DIR/beat.log"
FE_LOG="$LOG_DIR/frontend.log"

mkdir -p "$PID_DIR" "$LOG_DIR"

# ====================================================== 
# Colors & Logging
# ====================================================== 
GREEN="\033[0;32m"
BLUE="\033[0;34m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m"

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ====================================================== 
# Utils
# ====================================================== 
check_port() {
    if lsof -i ":$1" >/dev/null 2>&1; then
        error "Port $1 already in use"
        exit 1
    fi
}

wait_for_port() {
    local port=$1
    local name=$2
    for _ in {1..20}; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            ok "$name ready on port $port"
            return
        fi
        sleep 0.5
    done
    warn "$name did not become ready"
}

start_bg() {
    local name=$1
    local pidfile=$2
    local logfile=$3
    shift 3

    "$@" >"$logfile" 2>&1 &
    local pid=$!

    if ! echo "$pid" > "$pidfile"; then
        error "Failed to write PID for $name"
        kill "$pid" 2>/dev/null || true
        exit 1
    fi

    ok "$name started (PID $pid)"
}

stop_pidfile() {
    local name=$1
    local pidfile=$2

    if [[ ! -f "$pidfile" ]]; then
        warn "$name not running"
        return
    fi

    local pid
    pid=$(cat "$pidfile")

    if kill -0 "$pid" 2>/dev/null; then
        warn "Stopping $name (PID $pid)"
        kill "$pid"
        wait "$pid" 2>/dev/null || true
    fi

    rm -f "$pidfile"
    ok "$name stopped"
}

kill_port_fallback() {
    lsof -ti ":$1" 2>/dev/null | xargs -r kill -9 || true
}

# ====================================================== 
# Doctor
# ====================================================== 
doctor() {
    info "Running SynqX doctor checks"

    # -----------------------
    # Python / venv
    # -----------------------
    if [[ -d "$PROJECT_ROOT/backend/.venv" ]]; then
        info "Activating backend virtualenv for checks"
        # shellcheck disable=SC1091
        source "$PROJECT_ROOT/backend/.venv/bin/activate"
    fi

    if command -v python >/dev/null 2>&1; then
        ok "Python found: $(python --version)"
    elif command -v python3 >/dev/null 2>&1; then
        ok "Python3 found: $(python3 --version)"
    else
        error "Neither python nor python3 found"
        return 1
    fi

    # -----------------------
    # Node / tooling
    # -----------------------
    command -v node >/dev/null 2>&1 \
        && ok "Node found: $(node --version)" \
        || error "node not found"

    command -v npm >/dev/null 2>&1 \
        && ok "npm found: $(npm --version)" \
        || error "npm not found"

    command -v lsof >/dev/null 2>&1 \
        && ok "lsof available" \
        || error "lsof not found"

    command -v celery >/dev/null 2>&1 \
        && ok "celery available" \
        || warn "celery not found (will rely on venv)"

    # -----------------------
    # Project structure
    # -----------------------
    [[ -d "$PROJECT_ROOT/backend" ]] \
        && ok "backend/ exists" \
        || error "backend/ missing"

    [[ -d "$PROJECT_ROOT/frontend" ]] \
        && ok "frontend/ exists" \
        || error "frontend/ missing"

    # -----------------------
    # Ports (WARN only)
    # -----------------------
    for port in "$API_PORT" "$FE_PORT"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            warn "Port $port is currently in use"
        else
            ok "Port $port is free"
        fi
    done

    ok "Doctor checks completed"
}


# ====================================================== 
# Logs
# ====================================================== 
logs() {
    case "${2:-}" in
        api)        tail -f "$API_LOG" ;;
        worker)     tail -f "$WORKER_LOG" ;;
        beat)       tail -f "$BEAT_LOG" ;;
        frontend)   tail -f "$FE_LOG" ;;
        *) 
            echo "Usage: $0 logs {api|worker|beat|frontend}"
            exit 1
            ;;
    esac
}

# ====================================================== 
# Start / Stop
# ====================================================== 
start_stack() {
    info "Starting SynqX Stack"

    check_port "$API_PORT"
    check_port "$FE_PORT"

    # Backend
    cd "$PROJECT_ROOT/backend" || exit 1

    if [[ -d ".venv" ]]; then
        source .venv/bin/activate
        ok "Virtualenv activated"
    else
        warn "No virtualenv found"
    fi

    start_bg "API" "$API_PID" "$API_LOG" \
        uvicorn main:app --reload --port "$API_PORT"

    start_bg "Worker" "$WORKER_PID" "$WORKER_LOG" \
        celery -A app.core.celery_app worker --loglevel=info --pool=solo

    start_bg "Beat" "$BEAT_PID" "$BEAT_LOG" \
        celery -A app.core.celery_app beat --loglevel=info

    cd "$PROJECT_ROOT"
    wait_for_port "$API_PORT" "Backend API"

    # Frontend
    cd "$PROJECT_ROOT/frontend" || exit 1
    start_bg "Frontend" "$FE_PID" "$FE_LOG" npm run dev -- --host
    cd "$PROJECT_ROOT"

    echo
    ok "SynqX Stack is up"
    echo "  API      → http://localhost:$API_PORT/docs"
    echo "  Frontend → http://localhost:$FE_PORT"
}

stop_stack() {
    info "Stopping SynqX Stack"

    stop_pidfile "Frontend" "$FE_PID"
    stop_pidfile "Beat" "$BEAT_PID"
    stop_pidfile "Worker" "$WORKER_PID"
    stop_pidfile "API" "$API_PID"

    kill_port_fallback "$API_PORT"
    kill_port_fallback "$FE_PORT"

    ok "SynqX Stack stopped"
}

status_stack() {
    info "SynqX Status"
    for f in "$API_PID" "$WORKER_PID" "$BEAT_PID" "$FE_PID"; do
        local name
        name=$(basename "$f" .pid)
        if [[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null; then
            ok "$name running"
        else
            warn "$name stopped"
        fi
    done
}

# ====================================================== 
# tmux Dev Mode
# ====================================================== 
tmux_mode() {
    command -v tmux >/dev/null || { error "tmux not installed"; exit 1; }

    tmux new-session -d -s synqx
    tmux rename-window -t synqx:0 api
    tmux send-keys -t synqx "cd $PROJECT_ROOT && ./scripts/synqx.sh start" C-m
    tmux attach -t synqx
}

# ====================================================== 
# CLI
# ====================================================== 
case "${1:-}" in
    start)    start_stack ;; 
    stop)     stop_stack ;; 
    restart)  stop_stack; start_stack ;; 
    status)   status_stack ;; 
    logs)     logs "$@" ;; 
    doctor)   doctor ;; 
    tmux)     tmux_mode ;; 
    *) 
        echo "Usage: $0 {start|stop|restart|status|logs|doctor|tmux}"
        exit 1
        ;;
esac