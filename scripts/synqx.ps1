# SynqX Windows Management Script
# Replicates the functionality of synqx.sh for PowerShell

$ErrorActionPreference = "Stop"

# ======================================================
# Paths
# ======================================================
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$BACKEND_DIR = Join-Path $PROJECT_ROOT "backend"
$FRONTEND_DIR = Join-Path $PROJECT_ROOT "frontend"

$PID_DIR = Join-Path $PROJECT_ROOT ".synqx"
$LOG_DIR = Join-Path $PID_DIR "logs"

if (-not (Test-Path $PID_DIR)) { New-Item -ItemType Directory -Path $PID_DIR | Out-Null }
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }

$API_PID_FILE = Join-Path $PID_DIR "api.pid"
$WORKER_PID_FILE = Join-Path $PID_DIR "worker.pid"
$BEAT_PID_FILE = Join-Path $PID_DIR "beat.pid"
$FE_PID_FILE = Join-Path $PID_DIR "frontend.pid"

$API_LOG = Join-Path $LOG_DIR "api.log"
$WORKER_LOG = Join-Path $LOG_DIR "worker.log"
$BEAT_LOG = Join-Path $LOG_DIR "beat.log"
$FE_LOG = Join-Path $LOG_DIR "frontend.log"

# ======================================================
# Load .env
# ======================================================
$env_path = Join-Path $PROJECT_ROOT ".env"
if (Test-Path $env_path) {
    Get-Content $env_path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $name, $value = $line -split '=', 2
            if ($name -and $value) {
                [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
            }
        }
    }
}

$API_PORT = [System.Environment]::GetEnvironmentVariable("API_PORT") -or 8000
$FE_PORT = [System.Environment]::GetEnvironmentVariable("FE_PORT") -or 5173

# ======================================================
# Logging Utilities
# ======================================================
function Write-Info($msg) { Write-Host "[INFO]  $msg" -ForegroundColor Blue }
function Write-Ok($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# ======================================================
# Utils
# ======================================================
function Check-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Error "Port $port already in use"
        exit 1
    }
}

function Wait-For-Port($port, $name) {
    for ($i = 0; $i -lt 20; $i++) {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conn) {
            Write-Ok "$name ready on port $port"
            return
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Warn "$name did not become ready"
}

function Start-Bg($name, $pidfile, $logfile, $command, $args, $workingDir) {
    # Ensure log file exists and is empty
    "" | Out-File -FilePath $logfile -Encoding utf8
    
    $process = Start-Process -FilePath $command -ArgumentList $args `
        -RedirectStandardOutput $logfile -RedirectStandardError $logfile `
        -WorkingDirectory $workingDir -PassThru -NoNewWindow
    
    if ($process) {
        $process.Id | Out-File -FilePath $pidfile -Encoding ascii
        Write-Ok "$name started (PID $($process.Id))"
    } else {
        Write-Error "Failed to start $name"
        exit 1
    }
}

function Stop-PidFile($name, $pidfile) {
    if (-not (Test-Path $pidfile)) {
        Write-Warn "$name not running"
        return
    }

    $pid = Get-Content $pidfile -Raw
    $pid = $pid.Trim()

    try {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Warn "Stopping $name (PID $pid)"
            Stop-Process -Id $pid -Force
            # Wait for it to actually exit
            $timeout = 0
            while ((Get-Process -Id $pid -ErrorAction SilentlyContinue) -and ($timeout -lt 50)) { 
                Start-Sleep -Milliseconds 100 
                $timeout++
            }
        }
    } catch {
        # Process already gone
    }

    Remove-Item $pidfile -ErrorAction SilentlyContinue
    Write-Ok "$name stopped"
}

function Kill-Port-Fallback($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            if ($c.OwningProcess -gt 0) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# ======================================================
# Commands
# ======================================================
function Run-Doctor {
    Write-Info "Running SynqX doctor checks"

    # Python
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $version = python --version 2>&1
        Write-Ok "Python found: $version"
    } else {
        Write-Error "Python not found"
    }

    # Node
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $version = node --version
        Write-Ok "Node found: $version"
    } else {
        Write-Error "Node not found"
    }

    # Paths
    if (Test-Path $BACKEND_DIR) { Write-Ok "backend/ exists" } else { Write-Error "backend/ missing" }
    if (Test-Path $FRONTEND_DIR) { Write-Ok "frontend/ exists" } else { Write-Error "frontend/ missing" }

    # Infrastructure (Simple port checks as proxies)
    # Redis (Default 6379)
    $redisConn = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
    if ($redisConn) { Write-Ok "Redis appears to be running on 6379" } else { Write-Warn "Redis not detected on 6379" }

    # PostgreSQL (Default 5432)
    $pgConn = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
    if ($pgConn) { Write-Ok "PostgreSQL appears to be running on 5432" } else { Write-Warn "PostgreSQL not detected on 5432" }

    # App Ports
    foreach ($port in @($API_PORT, $FE_PORT)) {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conn) { Write-Warn "Port $port is currently in use" } else { Write-Ok "Port $port is free" }
    }

    Write-Ok "Doctor checks completed"
}

function Show-Logs($service) {
    $logMap = @{
        "api" = $API_LOG
        "worker" = $WORKER_LOG
        "beat" = $BEAT_LOG
        "frontend" = $FE_LOG
    }

    if ($logMap.ContainsKey($service)) {
        $path = $logMap[$service]
        if (Test-Path $path) {
            Write-Info "Tailing logs for $service (Ctrl+C to stop)..."
            Get-Content $path -Wait -Tail 20
        } else {
            Write-Error "Log file not found: $path"
        }
    } else {
        Write-Host "Usage: .\synqx.ps1 logs {api|worker|beat|frontend}"
    }
}

function Start-Stack {
    Write-Info "Starting SynqX Stack"

    Check-Port $API_PORT
    Check-Port $FE_PORT

    $venv_python = Join-Path $BACKEND_DIR ".venv\Scripts\python.exe"
    $venv_celery = Join-Path $BACKEND_DIR ".venv\Scripts\celery.exe"
    
    if (-not (Test-Path $venv_python)) {
        Write-Warn "Virtualenv not found at $venv_python. Falling back to system python."
        $python_cmd = "python"
        $celery_cmd = "celery"
    } else {
        $python_cmd = $venv_python
        $celery_cmd = $venv_celery
    }

    # API
    Start-Bg "API" $API_PID_FILE $API_LOG $python_cmd @("-m", "uvicorn", "main:app", "--reload", "--port", $API_PORT) $BACKEND_DIR

    # Worker
    Start-Bg "Worker" $WORKER_PID_FILE $WORKER_LOG $celery_cmd @("-A", "app.core.celery_app", "worker", "--loglevel=info", "--pool=solo") $BACKEND_DIR

    # Beat
    Start-Bg "Beat" $BEAT_PID_FILE $BEAT_LOG $celery_cmd @("-A", "app.core.celery_app", "beat", "--loglevel=info") $BACKEND_DIR

    Wait-For-Port $API_PORT "Backend API"

    # Frontend
    Start-Bg "Frontend" $FE_PID_FILE $FE_LOG "npm.cmd" @("run", "dev", "--", "--host") $FRONTEND_DIR

    Write-Host ""
    Write-Ok "SynqX Stack is up 🚀"
    Write-Host "  API      → http://localhost:$API_PORT/docs"
    Write-Host "  Frontend → http://localhost:$FE_PORT"
}

function Stop-Stack {
    Write-Info "Stopping SynqX Stack"

    Stop-PidFile "Frontend" $FE_PID_FILE
    Stop-PidFile "Beat" $BEAT_PID_FILE
    Stop-PidFile "Worker" $WORKER_PID_FILE
    Stop-PidFile "API" $API_PID_FILE

    Kill-Port-Fallback $API_PORT
    Kill-Port-Fallback $FE_PORT

    Write-Ok "SynqX Stack stopped"
}

function Show-Status {
    Write-Info "SynqX Status"
    $files = @{
        "API" = $API_PID_FILE
        "Worker" = $WORKER_PID_FILE
        "Beat" = $BEAT_PID_FILE
        "Frontend" = $FE_PID_FILE
    }

    foreach ($name in $files.Keys) {
        $f = $files[$name]
        if (Test-Path $f) {
            $pid = Get-Content $f -Raw
            $pid = $pid.Trim()
            if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
                Write-Ok "$name running (PID $pid)"
                continue
            }
        }
        Write-Warn "$name stopped"
    }
}

# ======================================================
# CLI Logic
# ======================================================
if ($args.Count -eq 0) {
    Write-Host "Usage: .\synqx.ps1 {start|stop|restart|status|logs|doctor}"
    exit 1
}

$cmd = $args[0]

switch ($cmd) {
    "start"   { Start-Stack }
    "stop"    { Stop-Stack }
    "restart" { Stop-Stack; Start-Stack }
    "status"  { Show-Status }
    "logs"    { Show-Logs $args[1] }
    "doctor"  { Run-Doctor }
    Default {
        Write-Host "Usage: .\synqx.ps1 {start|stop|restart|status|logs|doctor}"
        exit 1
    }
}