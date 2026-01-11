#!/usr/bin/env bash
set -Eeuo pipefail

# ====================================================== 
# Script paths (ABSOLUTE, SAFE)
# ====================================================== 
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ====================================================== 
# Colors & Formatting
# ====================================================== 
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Icons
ICON_INFO="ℹ️"
ICON_OK="✅"
ICON_WARN="⚠️"
ICON_ERR="❌"
ICON_START="🚀"
ICON_STOP="🛑"
ICON_LOG="📝"

# ====================================================== 
# Config
# ====================================================== 
API_PORT="${API_PORT:-8000}"
FE_PORT="${FE_PORT:-5173}"

PID_DIR="$PROJECT_ROOT/.synqx"
LOG_DIR="$PROJECT_ROOT/.synqx/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

# ====================================================== 
# Helpers
# ====================================================== 
get_svc_name() {
    case "$1" in
        api) echo "Backend API" ;; 
        worker) echo "Celery Worker" ;; 
        beat) echo "Celery Beat" ;; 
        frontend) echo "Frontend" ;; 
        agent) echo "SynqX Agent" ;; 
        *) echo "Unknown" ;; 
    esac
}

info()  { echo -e "${BLUE}${ICON_INFO}  ${BOLD}$*${NC}"; }
ok()    { echo -e "${GREEN}${ICON_OK}  $*${NC}"; }
warn()  { echo -e "${YELLOW}${ICON_WARN}  $*${NC}"; }
error() { echo -e "${RED}${ICON_ERR}  $*${NC}"; }

# ====================================================== 
# Setup / Install
# ====================================================== 
ensure_tool() {
    if ! command -v "$1" >/dev/null 2>&1; then
        error "$1 not found. Please install it."
        exit 1
    fi
}

install() {
    info "Starting Full Stack Installation..."
    ensure_tool "uv"
    ensure_tool "npm"

    # Shared Libs
    info "Linking Shared Libraries..."
    cd "$PROJECT_ROOT/backend"
    [[ ! -d ".venv" ]] && uv venv
    uv pip install -e ../libs/synqx-core -e ../libs/synqx-engine
    
    # Backend
    info "Installing Backend Dependencies..."
    uv pip install -r requirements.txt
    
    # Agent
    info "Setting up Agent..."
    cd "$PROJECT_ROOT/agent"
    [[ ! -d ".venv" ]] && uv venv
    uv pip install -e ../libs/synqx-core -e ../libs/synqx-engine -r requirements.txt
    
    # Frontend
    info "Installing Frontend Dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install
    
    ok "Installation Complete!"
}

# ====================================================== 
# Process Management
# ====================================================== 
get_pid() {
    local svc=$1
    local pid_file="$PID_DIR/$svc.pid"
    if [[ -f "$pid_file" ]]; then
        cat "$pid_file"
    fi
}

is_running() {
    local svc=$1
    local pid
    pid=$(get_pid "$svc")
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        return 0
    fi
    return 1
}

start_svc() {
    local svc=$1
    local name=$(get_svc_name "$svc")
    local log_file="$LOG_DIR/$svc.log"
    local pid_file="$PID_DIR/$svc.pid"

    if is_running "$svc"; then
        warn "$name is already running."
        return
    fi

    info "Launching $name..."
    
    case "$svc" in
        api)
            cd "$PROJECT_ROOT/backend"
            nohup "$PROJECT_ROOT/backend/.venv/bin/uvicorn" main:app --reload --port "$API_PORT" --host 0.0.0.0 >"$log_file" 2>&1 &
            ;;
        worker)
            cd "$PROJECT_ROOT/backend"
            nohup "$PROJECT_ROOT/backend/.venv/bin/celery" -A app.core.celery_app worker --loglevel=info --pool=solo >"$log_file" 2>&1 &
            ;;
        beat)
            cd "$PROJECT_ROOT/backend"
            nohup "$PROJECT_ROOT/backend/.venv/bin/celery" -A app.core.celery_app beat --loglevel=info >"$log_file" 2>&1 &
            ;;
        frontend)
            cd "$PROJECT_ROOT/frontend"
            nohup npm run dev -- --host --port "$FE_PORT" >"$log_file" 2>&1 &
            ;;
        agent)
            cd "$PROJECT_ROOT/agent"
            nohup "$PROJECT_ROOT/agent/.venv/bin/python" main.py start >"$log_file" 2>&1 &
            ;;
    esac

    local pid=$!
    echo "$pid" > "$pid_file"
    
    # Quick health check
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        ok "$name started (PID: $pid)"
    else
        error "$name failed to start. Check logs: $log_file"
        rm -f "$pid_file"
    fi
}

stop_svc() {
    local svc=$1
    local name=$(get_svc_name "$svc")
    local pid
    pid=$(get_pid "$svc")

    if [[ -n "$pid" ]]; then
        echo -ne "${YELLOW}${ICON_STOP}  Stopping $name ($pid)...${NC}"
        # Kill process group to catch sub-processes (like uvicorn reload)
        { kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null; } && echo " Done." || echo " Not running."
        rm -f "$PID_DIR/$svc.pid"
    fi
}

# ====================================================== 
# Commands
# ====================================================== 
status() {
    echo -e "\n${BOLD}SynqX Service Status${NC}"
    echo -e "----------------------------------------"
    printf "% -20s %-10s %-10s\n" "Service" "Status" "PID"
    
    for svc in "api" "worker" "beat" "frontend" "agent"; do
        local name=$(get_svc_name "$svc")
        if is_running "$svc"; then
            local pid
            pid=$(get_pid "$svc")
            printf "% -20s ${GREEN}%-10s${NC} %-10s\n" "$name" "RUNNING" "$pid"
        else
            printf "% -20s ${RED}%-10s${NC} %-10s\n" "$name" "STOPPED" "-"
        fi
    done
    echo
}

start_all() {
    info "${ICON_START}  Starting SynqX Ecosystem..."
    # Check ports first
    lsof -i ":$API_PORT" >/dev/null 2>&1 && { error "Port $API_PORT in use. Kill existing processes first."; exit 1; }
    lsof -i ":$FE_PORT" >/dev/null 2>&1 && { error "Port $FE_PORT in use. Kill existing processes first."; exit 1; }

    start_svc "api"
    start_svc "worker"
    start_svc "beat"
    start_svc "frontend"
    
    if [[ "${1:-}" == "--with-agent" ]]; then
        start_svc "agent"
    fi
    
    echo
    ok "Ecosystem is online."
    status
}

stop_all() {
    info "${ICON_STOP}  Shutting down SynqX Ecosystem..."
    for svc in "agent" "frontend" "beat" "worker" "api"; do
        stop_svc "$svc"
    done
    
    # Cleanup zombie ports
    lsof -ti ":$API_PORT" | xargs kill -9 2>/dev/null || true
    lsof -ti ":$FE_PORT" | xargs kill -9 2>/dev/null || true
    
    ok "All services stopped."
}

show_logs() {
    local svc=${1:-}
    if [[ -z "$svc" ]]; then
        info "Tailing all logs (Ctrl+C to stop)..."
        tail -f "$LOG_DIR"/*.log
    else
        local name=$(get_svc_name "$svc")
        if [[ "$name" != "Unknown" ]]; then
            info "Tailing logs for $name..."
            tail -f "$LOG_DIR/$svc.log"
        else
            error "Unknown service: $svc. Available: api, worker, beat, frontend, agent"
        fi
    fi
}

# ====================================================== 
# Entry Point
# ====================================================== 
usage() {
    echo -e "${BOLD}SynqX Developer CLI${NC}"
    echo -e "Usage: $0 {command} [options]\n"
    echo -e "Commands:"
    echo -e "  ${CYAN}install${NC}          Install all dependencies and setup venvs"
    echo -e "  ${CYAN}start${NC}            Start the core stack (API, Worker, Beat, Frontend)"
    echo -e "  ${CYAN}start --with-agent${NC} Start core stack + local SynqX Agent"
    echo -e "  ${CYAN}stop${NC}             Stop all running SynqX services"
    echo -e "  ${CYAN}status${NC}           Show status of all services"
    echo -e "  ${CYAN}restart${NC}          Restart all services"
    echo -e "  ${CYAN}logs [service]${NC}   Tail logs (omit service to tail all)"
    echo -e "  ${CYAN}clean [--full]${NC}   Cleanup logs and cache (use --full for venvs/modules)"
    echo
}

case "${1:-}" in
    install) install ;; 
    start)   start_all "${2:-}" ;; 
    stop)    stop_all ;; 
    restart) stop_all; sleep 1; start_all "${2:-}" ;; 
    status)  status ;; 
    logs)    show_logs "${2:-}" ;; 
    clean)   
        rm -rf "$PID_DIR"
        find . -name "__pycache__" -type d -exec rm -rf {} +
        ok "Cleaned cache and logs."
        if [[ "${2:-}" == "--full" ]]; then
            rm -rf backend/.venv agent/.venv frontend/node_modules
            warn "Deep clean complete: Virtualenvs and node_modules removed."
        fi
        ;;
    *) usage ;; 
esac
