<#
.SYNOPSIS
    SynqX Developer CLI for Windows
    Usage: .\synqx.ps1 [command] [options]

.DESCRIPTION
    Robust management script for the SynqX development stack on Windows.
    Handles installation, process management, logging, and cleanup.

.PARAMETER Command
    install, start, stop, restart, status, logs, clean

.PARAMETER Option
    Additional flags like --with-agent, --full
#>

param (
    [string]$Command = "help",
    [string]$Option = ""
)

$ErrorActionPreference = "Stop"

# ======================================================
# Config & Paths
# ======================================================
$ScriptDir = $PSScriptRoot
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$PidDir = Join-Path $ProjectRoot ".synqx"
$LogDir = Join-Path $PidDir "logs"

# Ensure directories exist
if (-not (Test-Path $PidDir)) { New-Item -ItemType Directory -Path $PidDir | Out-Null }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$ApiPort = 8000
$FePort = 5173

# ======================================================
# UI Helpers (No Emojis)
# ======================================================
function Log-Info ($Message) { Write-Host "[INFO]  $Message" -ForegroundColor Cyan }
function Log-Ok   ($Message) { Write-Host "[OK]    $Message" -ForegroundColor Green }
function Log-Warn ($Message) { Write-Host "[WARN]  $Message" -ForegroundColor Yellow }
function Log-Err  ($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

# ======================================================
# Utilities
# ======================================================
function Get-PythonPath ($VenvPath) {
    return Join-Path $VenvPath "Scripts\python.exe"
}

function Test-Port ($Port) {
    $TcpConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $TcpConn
}

function Get-ServicePid ($Name) {
    $PidFile = Join-Path $PidDir "$Name.pid"
    if (Test-Path $PidFile) {
        return Get-Content $PidFile
    }
    return $null
}

function Is-Running ($Name) {
    $PidVal = Get-ServicePid $Name
    if (-not [string]::IsNullOrWhiteSpace($PidVal)) {
        if (Get-Process -Id $PidVal -ErrorAction SilentlyContinue) {
            return $true
        }
    }
    return $false
}

# ======================================================
# Core Functions
# ======================================================

function Install-Stack {
    Log-Info "Starting Full Stack Installation..."

    # Check tools
    if (-not (Get-Command "uv" -ErrorAction SilentlyContinue)) { Log-Err "uv not found."; exit 1 }
    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) { Log-Err "npm not found."; exit 1 }

    # Shared Libs
    Log-Info "Linking Shared Libraries..."
    Push-Location (Join-Path $ProjectRoot "backend")
    if (-not (Test-Path ".venv")) { uv venv }
    uv pip install -e ../libs/synqx-core -e ../libs/synqx-engine
    Pop-Location

    # Backend
    Log-Info "Installing Backend Dependencies..."
    Push-Location (Join-Path $ProjectRoot "backend")
    uv pip install -r requirements.txt
    Pop-Location

    # Agent
    Log-Info "Setting up Agent..."
    Push-Location (Join-Path $ProjectRoot "agent")
    if (-not (Test-Path ".venv")) { uv venv }
    uv pip install -e ../libs/synqx-core -e ../libs/synqx-engine -r requirements.txt
    Pop-Location

    # Frontend
    Log-Info "Installing Frontend Dependencies..."
    Push-Location (Join-Path $ProjectRoot "frontend")
    cmd /c "npm install"
    Pop-Location

    Log-Ok "Installation Complete!"
}

function Start-Service {
    param ($Name, $WorkDir, $Cmd, $Args)

    if (Is-Running $Name) {
        Log-Warn "$Name is already running."
        return
    }

    Log-Info "Launching $Name..."

    $LogFile = Join-Path $LogDir "$Name.log"
    $PidFile = Join-Path $PidDir "$Name.pid"

    # Start Process
    # We use Start-Process with redirection.
    # Note: Redirecting stdout/stderr in PS Start-Process is tricky for background jobs.
    # We use a wrapper script block for robust logging.
    
    $ScriptBlock = {
        param($C, $A, $L, $W)
        Set-Location $W
        & $C @A > $L 2>&1
    }

    # Use PowerShell background job to act as a detached process
    # This keeps the window clean and allows proper PID tracking of the shell runner
    # For more direct control we launch the executable directly
    
    $Process = Start-Process -FilePath $Cmd -ArgumentList $Args -WorkingDirectory $WorkDir -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile -PassThru -NoNewWindow

    if ($Process) {
        $Process.Id | Out-File -FilePath $PidFile -Encoding ascii
        Log-Ok "$Name started (PID: $($Process.Id))"
    } else {
        Log-Err "Failed to start $Name"
    }
}

function Start-All {
    if (Test-Port $ApiPort) { Log-Err "Port $ApiPort is in use."; exit 1 }
    if (Test-Port $FePort) { Log-Err "Port $FePort is in use."; exit 1 }

    # API
    $BackDir = Join-Path $ProjectRoot "backend"
    $BackPy = Get-PythonPath (Join-Path $BackDir ".venv")
    Start-Service -Name "api" -WorkDir $BackDir -Cmd $BackPy -Args @("-m", "uvicorn", "main:app", "--reload", "--port", "$ApiPort", "--host", "0.0.0.0")

    # Worker
    Start-Service -Name "worker" -WorkDir $BackDir -Cmd $BackPy -Args @("-m", "celery", "-A", "app.core.celery_app", "worker", "--loglevel=info", "--pool=solo")

    # Beat
    Start-Service -Name "beat" -WorkDir $BackDir -Cmd $BackPy -Args @("-m", "celery", "-A", "app.core.celery_app", "beat", "--loglevel=info")

    # Frontend
    $FrontDir = Join-Path $ProjectRoot "frontend"
    # npm on windows is a batch file, need to run via cmd /c or find npm.cmd
    $NpmCmd = (Get-Command "npm").Source
    Start-Service -Name "frontend" -WorkDir $FrontDir -Cmd $NpmCmd -Args @("run", "dev", "--", "--host", "--port", "$FePort")

    # Agent (Optional)
    if ($Option -eq "--with-agent") {
        $AgentDir = Join-Path $ProjectRoot "agent"
        $AgentPy = Get-PythonPath (Join-Path $AgentDir ".venv")
        Start-Service -Name "agent" -WorkDir $AgentDir -Cmd $AgentPy -Args @("main.py", "start")
    }

    Log-Ok "Ecosystem is online."
    Show-Status
}

function Stop-Service ($Name) {
    $PidVal = Get-ServicePid $Name
    if (-not [string]::IsNullOrWhiteSpace($PidVal)) {
        if (Get-Process -Id $PidVal -ErrorAction SilentlyContinue) {
            Write-Host -NoNewline "[INFO]  Stopping $Name ($PidVal)... "
            Stop-Process -Id $PidVal -Force -ErrorAction SilentlyContinue
            Write-Host "Done."
        }
        Remove-Item (Join-Path $PidDir "$Name.pid") -ErrorAction SilentlyContinue
    }
}

function Stop-All {
    Log-Info "Shutting down SynqX Ecosystem..."
    foreach ($svc in @("agent", "frontend", "beat", "worker", "api")) {
        Stop-Service $svc
    }
    Log-Ok "All services stopped."
}

function Show-Status {
    Write-Host "`nSynqX Service Status" -ForegroundColor Cyan
    Write-Host "--------------------" -ForegroundColor Cyan
    
    foreach ($svc in @("api", "worker", "beat", "frontend", "agent")) {
        if (Is-Running $svc) {
            $PidVal = Get-ServicePid $svc
            Write-Host "$($svc.PadRight(15)) RUNNING    (PID: $PidVal)" -ForegroundColor Green
        } else {
            Write-Host "$($svc.PadRight(15)) STOPPED" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Show-Logs ($SvcName) {
    if ([string]::IsNullOrWhiteSpace($SvcName)) {
        Log-Info "Tailing all logs is not supported well in PS. Please specify a service."
        Log-Info "Available: api, worker, beat, frontend, agent"
    } else {
        $LogFile = Join-Path $LogDir "$SvcName.log"
        if (Test-Path $LogFile) {
            Log-Info "Tailing logs for $SvcName (Ctrl+C to stop)..."
            Get-Content $LogFile -Wait -Tail 20
        } else {
            Log-Err "Log file not found: $LogFile"
        }
    }
}

function Clean-Artifacts {
    Log-Info "Cleaning up artifacts..."
    if (Test-Path $PidDir) { Remove-Item $PidDir -Recurse -Force | Out-Null }
    
    # Remove pycache
    Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force | Out-Null
    
    Log-Ok "Cleaned cache and logs."

    if ($Option -eq "--full") {
        Log-Warn "Deep cleaning (venvs and node_modules)..."
        Remove-Item (Join-Path $ProjectRoot "backend/.venv") -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $ProjectRoot "agent/.venv") -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $ProjectRoot "frontend/node_modules") -Recurse -Force -ErrorAction SilentlyContinue
        Log-Ok "Deep clean complete."
    }
}

# ======================================================
# Main Dispatch
# ======================================================
switch ($Command) {
    "install" { Install-Stack }
    "start"   { Start-All }
    "stop"    { Stop-All }
    "restart" { Stop-All; Start-All }
    "status"  { Show-Status }
    "logs"    { Show-Logs $Option }
    "clean"   { Clean-Artifacts }
    Default {
        Write-Host "SynqX Developer CLI (Windows)" -ForegroundColor Cyan
        Write-Host "Usage: .\scripts\synqx.bat [command] [options]`n"
        Write-Host "Commands:"
        Write-Host "  install          Install dependencies and setup venvs"
        Write-Host "  start            Start the core stack"
        Write-Host "  start --with-agent"
        Write-Host "                   Start stack + agent"
        Write-Host "  stop             Stop services"
        Write-Host "  status           Check status"
        Write-Host "  logs [service]   Tail logs for a service"
        Write-Host "  clean [--full]   Clean artifacts"
    }
}
