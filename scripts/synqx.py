#!/usr/bin/env python3
"""
SynqX Industrial Developer CLI - Complete Edition
================================================
Production-grade orchestration for SynqX monorepo.
"""

import os
import sys
import subprocess
import shutil
import time
import signal
import re
import platform
import json
import socket
import tarfile
import hashlib
import threading
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, asdict

# --- Mandatory Dependency Check ---
MISSING = []
try:
    from typer import Typer, Argument, Option
except ImportError:
    MISSING.append("typer")
try:
    import psutil
except ImportError:
    MISSING.append("psutil")
try:
    from rich.console import Console
    from rich.theme import Theme
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
    from rich import box
except ImportError:
    MISSING.append("rich")

if MISSING:
    print(f"\n[!] ERROR: Missing production libraries: {', '.join(MISSING)}")
    print(f"    Please run: pip install {' '.join(MISSING)}\n")
    sys.exit(1)

# --- UI Setup ---
console = Console(theme=Theme({
    "info": "cyan",
    "warning": "yellow",
    "error": "red bold",
    "success": "green bold",
    "header": "magenta bold",
    "cmd": "blue bold",
}))

# --- Constants & Config ---
ROOT_DIR = Path(__file__).resolve().parent.parent
PID_DIR = ROOT_DIR / ".synqx"
LOG_DIR = PID_DIR / "logs"
BACKUP_DIR = PID_DIR / "backups"
CONFIG_FILE = ROOT_DIR / "synqx.config.json"

for d in [PID_DIR, LOG_DIR, BACKUP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

DEFAULT_CONFIG = {
    "api_port": 8000,
    "frontend_port": 5173,
    "log_level": "INFO",
    "health_check_interval": 30,
    "max_restart_attempts": 3,
    "graceful_shutdown_timeout": 10,
    "build": {"verify": True, "parallel": True},
    "database": {"backup": True, "retention": 7}
}

class Config:
    def __init__(self):
        self._data = DEFAULT_CONFIG.copy()
        self.load()
    
    def load(self):
        if CONFIG_FILE.exists():
            try:
                content = CONFIG_FILE.read_text()
                if content:
                    self._data.update(json.loads(content))
            except Exception as e:
                console.print(f"[warning]Failed to load config: {e}[/warning]")
    
    def save(self):
        try:
            CONFIG_FILE.write_text(json.dumps(self._data, indent=2))
        except Exception as e:
            console.print(f"[error]Failed to save config: {e}[/error]")

    def get(self, key: str, default=None):
        keys = key.split('.')
        val = self._data
        for k in keys:
            if isinstance(val, dict):
                val = val.get(k, default)
            else:
                return default
        return val
    
    def set(self, key: str, value):
        keys = key.split('.')
        target = self._data
        for k in keys[:-1]:
            target = target.setdefault(k, {})
        target[keys[-1]] = value
        self.save()

config = Config()

# --- Utilities ---
def resolve_cmd(name: str) -> Optional[str]:
    """Finds the actual executable path OS-agnostically."""
    path = shutil.which(name)
    if path:
        return path
    if platform.system() == "Windows":
        for ext in [".cmd", ".exe", ".bat"]:
            path = shutil.which(f"{name}{ext}")
            if path:
                return path
    return None

def get_venv_python(proj: Path) -> str:
    """Returns path to python executable in venv."""
    venv_name = ".venv"
    if not (proj / venv_name).exists():
        # Fallback to current python if venv doesn't exist
        return sys.executable
    
    bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
    exe_name = "python.exe" if platform.system() == "Windows" else "python"
    path = proj / venv_name / bin_dir / exe_name
    return str(path) if path.exists() else sys.executable

def get_venv_bin(proj: Path, name: str) -> str:
    """Returns path to a binary in venv."""
    bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
    venv_path = proj / ".venv" / bin_dir
    
    if venv_path.exists():
        for ext in [".exe", ".cmd", ".bat", ""]:
            path = venv_path / f"{name}{ext}"
            if path.exists():
                return str(path)
                
    # Fallback to system path
    resolved = resolve_cmd(name)
    return resolved if resolved else name

def run(cmd: List[str], cwd: Path, env: dict = None, capture=False, check=True):
    """Execute a command and return results."""
    # Resolve first element of command
    resolved_bin = resolve_cmd(cmd[0])
    if resolved_bin:
        cmd[0] = resolved_bin
        
    try:
        res = subprocess.run(
            cmd, 
            cwd=cwd, 
            env={**os.environ, **(env or {})}, 
            check=check, 
            text=True, 
            capture_output=capture
        )
        return res.stdout if capture else None
    except subprocess.CalledProcessError as e:
        if capture:
            return (e.stdout or "") + (e.stderr or "")
        raise e

def check_http_health(url: str, timeout: int = 2) -> bool:
    """Check if a URL is reachable."""
    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False

def calculate_checksum(file_path: Path) -> str:
    """Calculate SHA256 checksum of a file."""
    sha = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for block in iter(lambda: f.read(4096), b''):
            sha.update(block)
    return sha.hexdigest()

def force_kill_port(port: int):
    """Robust cross-platform port clearing. Optimized for speed."""
    if platform.system() != "Windows":
        try:
            # Use lsof on Unix-like systems as it's significantly faster than psutil.net_connections()
            output = subprocess.check_output(["lsof", "-t", f"-i:{port}"], stderr=subprocess.STDOUT, text=True)
            for pid in output.split():
                try:
                    os.kill(int(pid), signal.SIGKILL)
                except Exception:
                    pass
            return
        except Exception:
            pass

    # Fallback to psutil for Windows or if lsof fails
    try:
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                for conn in proc.connections(kind='inet'):
                    if conn.laddr.port == port:
                        proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception:
        pass

# --- Service Definitions ---
API_PORT = config.get('api_port', 8000)
FE_PORT = config.get('frontend_port', 5173)

SERVICES = {
    "api": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["uvicorn", "main:app", "--reload", "--port", str(API_PORT), "--host", "0.0.0.0"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "health": f"http://localhost:{API_PORT}/health",
        "port": API_PORT, 
        "deps": []
    },
    "worker": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["celery", "-A", "app.core.celery_app", "worker", "-Q", "celery", "--loglevel=info", "--pool=solo"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "deps": ["api"]
    },
    "beat": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["celery", "-A", "app.core.celery_app", "beat", "--loglevel=info"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "deps": ["api"]
    },
    "telemetry": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["celery", "-A", "app.core.celery_app", "worker", "-Q", "telemetry", "--loglevel=info", "--pool=solo"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "deps": ["api"]
    },
    "frontend": {
        "dir": ROOT_DIR / "frontend",
        "cmd": ["npm", "run", "dev", "--", "--host", "--port", str(FE_PORT)],
        "health": f"http://localhost:{FE_PORT}",
        "port": FE_PORT, 
        "deps": ["api"]
    },
    "agent": {
        "dir": ROOT_DIR / "agent",
        "cmd": ["python", "main.py", "start"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "agent")},
        "deps": ["api"]
    }
}

@dataclass
class Meta:
    pid: int
    name: str
    start_time: float
    port: Optional[int] = None
    restart_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Meta':
        return cls(**data)

class Manager:
    def __init__(self):
        self._stop_event = threading.Event()

    def get_meta(self, name: str) -> Optional[Meta]:
        f = PID_DIR / f"{name}.json"
        if not f.exists():
            return None
        try:
            return Meta.from_dict(json.loads(f.read_text()))
        except Exception:
            return None

    def save_meta(self, name: str, meta: Meta):
        (PID_DIR / f"{name}.json").write_text(json.dumps(asdict(meta), indent=2))

    def start(self, name: str, fail_fast: bool = False) -> bool:
        svc = SERVICES.get(name)
        if not svc:
            console.print(f"[error]Unknown service: {name}[/error]")
            return False

        meta = self.get_meta(name)
        if meta and psutil.pid_exists(meta.pid):
            console.print(f"[info]Service {name} is already online (PID: {meta.pid})[/info]")
            return True

        # Handle dependencies
        for d in svc.get('deps', []):
            if not self.start(d, fail_fast):
                return False

        # Clear port if needed
        if svc.get('port'):
            # Check if port is in use
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.1)
                if s.connect_ex(('localhost', svc['port'])) == 0:
                    console.print(f"[warning]Port {svc['port']} is occupied. Evicting existing process...[/warning]")
                    force_kill_port(svc['port'])

        with console.status(f"[info]Launching {name}...[/info]"):
            cmd = list(svc["cmd"])
            cwd = svc["dir"]
            
            # Resolve executables
            if cmd[0] == "python":
                cmd[0] = get_venv_python(cwd)
            elif cmd[0] == "npm":
                resolved_npm = resolve_cmd("npm")
                if resolved_npm:
                    cmd[0] = resolved_npm
            else:
                cmd[0] = get_venv_bin(cwd, cmd[0])

            log_path = LOG_DIR / f"{name}.log"
            
            flags = {}
            if platform.system() == "Windows":
                flags['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
            else:
                flags['start_new_session'] = True

            try:
                with open(log_path, "a") as log_file:
                    proc = subprocess.Popen(
                        cmd, 
                        cwd=cwd, 
                        env={**os.environ, **svc.get("env", {})}, 
                        stdin=subprocess.DEVNULL,
                        stdout=log_file, 
                        stderr=subprocess.STDOUT, 
                        close_fds=(platform.system() != "Windows"),
                        **flags
                    )
                
                m = Meta(pid=proc.pid, name=name, start_time=time.time(), port=svc.get('port'))
                self.save_meta(name, m)
                
                # Intelligent polling instead of blocking sleep
                online = False
                for _ in range(20): # Max 2 seconds polling
                    if psutil.pid_exists(proc.pid):
                        # If service survives initial burst
                        if _ > 5: # Give it at least 0.5s
                            online = True
                            break
                    else:
                        break
                    time.sleep(0.1)

                if online:
                    console.print(f"[success]✓ {name} online (PID: {proc.pid})[/success]")
                    return True
                else:
                    console.print(f"[error]✗ {name} died shortly after startup. Check {log_path}[/error]")
                    if fail_fast:
                        sys.exit(1)
                    return False
            except Exception as e:
                console.print(f"[error]Failed to spawn {name}: {e}[/error]")
                if fail_fast:
                    sys.exit(1)
                return False

    def stop(self, name: str, force: bool = False):
        m = self.get_meta(name)
        if not m:
            return
            
        console.print(f"[info]Stopping {name} (PID: {m.pid})...[/info]")
        try:
            p = psutil.Process(m.pid)
            # Kill children first
            children = p.children(recursive=True)
            for c in children:
                try:
                    c.terminate()
                except Exception:
                    pass
            
            p.terminate()
            
            # Wait for termination
            gone, alive = psutil.wait_procs([p] + children, timeout=5)
            if alive and force:
                for a in alive:
                    try:
                        a.kill()
                    except Exception:
                        pass
        except psutil.NoSuchProcess:
            pass
        except Exception as e:
            console.print(f"[warning]Error stopping {name}: {e}[/warning]")
            
        (PID_DIR / f"{name}.json").unlink(missing_ok=True)
        console.print(f"[success]✓ {name} stopped.[/success]")

manager = Manager()

# --- Handlers ---
app = Typer(name="synqx", help="Industrial CLI for SynqX Monorepo", no_args_is_help=True, rich_markup_mode="rich")
db_app = Typer(help="Database management (Alembic)")
build_app = Typer(help="Build operations")
rel_app = Typer(help="Release & Versioning")
cfg_app = Typer(help="Configuration")

app.add_typer(db_app, name="db")
app.add_typer(build_app, name="build")
app.add_typer(rel_app, name="release")
app.add_typer(cfg_app, name="config")

@app.command()
def setup():
    """Idempotent monorepo setup and dependency installation."""
    console.print(Panel.fit("[header]SynqX Monorepo Setup[/header]"))
    
    with Progress(SpinnerColumn(), TextColumn("{task.description}"), BarColumn(), TimeElapsedColumn(), console=console) as prog:
        t = prog.add_task("Initializing", total=4)
        
        # Check prerequisites
        for tool in ["uv", "npm", "git"]:
            if not resolve_cmd(tool):
                console.print(f"[error]Prerequisite missing: {tool}[/error]")
                sys.exit(1)
        prog.advance(t)
        
        # Backend setup
        prog.update(t, description="Setting up Backend environment")
        backend_dir = ROOT_DIR / "backend"
        if not (backend_dir / ".venv").exists():
            run(["uv", "venv"], backend_dir)
        
        py_bin = get_venv_python(backend_dir)
        run(["uv", "pip", "install", "--python", py_bin, "-e", "../libs/synqx-core", "-e", "../libs/synqx-engine", "-r", "requirements.txt"], backend_dir)
        prog.advance(t)
        
        # Agent setup
        prog.update(t, description="Setting up Agent environment")
        agent_dir = ROOT_DIR / "agent"
        if not (agent_dir / ".venv").exists():
            run(["uv", "venv"], agent_dir)
            
        py_bin = get_venv_python(agent_dir)
        run(["uv", "pip", "install", "--python", py_bin, "-e", "../libs/synqx-core", "-e", "../libs/synqx-engine", "-r", "requirements.txt"], agent_dir)
        prog.advance(t)
        
        # Frontend setup
        prog.update(t, description="Installing Frontend dependencies")
        run(["npm", "install"], ROOT_DIR / "frontend")
        prog.advance(t)
        
    console.print("[success]✓ Setup complete. All environments are ready.[/success]")

@app.command()
def start(agent: bool = False, telemetry: bool = True, fail_fast: bool = False):
    """Start the SynqX stack."""
    svcs = ["api", "worker", "beat"]
    if telemetry:
        svcs.append("telemetry")
    svcs.append("frontend")
    if agent:
        svcs.append("agent")
        
    for s in svcs:
        if not manager.start(s, fail_fast=fail_fast):
            if fail_fast:
                break

@app.command()
def stop(force: bool = Option(False, "--force", help="Force kill processes")):
    """Stop all running SynqX services."""
    # Stop in reverse order of typical dependency
    all_svcs = list(SERVICES.keys())
    # Ensure frontend and agent are stopped first
    for s in ["frontend", "agent", "telemetry", "beat", "worker", "api"]:
        if s in all_svcs:
            manager.stop(s, force=force)

@app.command()
def restart(agent: bool = False, force: bool = False):
    """Restart the full SynqX stack."""
    stop(force=force)
    time.sleep(1)
    start(agent=agent)

@app.command()
def status():
    """Show the status of all services."""
    t = Table(title="SynqX Service Grid", box=box.ROUNDED, header_style="header")
    t.add_column("Service")
    t.add_column("Status")
    t.add_column("PID")
    t.add_column("Memory")
    t.add_column("Uptime")
    
    with console.status("[info]Scanning services...[/info]"):
        for name in SERVICES.keys():
            m = manager.get_meta(name)
            if m:
                try:
                    if psutil.pid_exists(m.pid):
                        p = psutil.Process(m.pid)
                        # Quick check to ensure it's still running and not a zombie
                        if p.is_running() and p.status() != psutil.STATUS_ZOMBIE:
                            mem = f"{p.memory_info().rss/1024/1024:.1f} MB"
                            uptime_sec = time.time() - m.start_time
                            upt = f"{int(uptime_sec//60)}m {int(uptime_sec%60)}s"
                            t.add_row(name, "[green]RUNNING[/green]", str(m.pid), mem, upt)
                        else:
                            t.add_row(name, "[yellow]STALE[/yellow]", str(m.pid), "---", "---")
                    else:
                        t.add_row(name, "[red]STOPPED[/red]", "---", "---", "---")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    t.add_row(name, "[red]STOPPED[/red]", "---", "---", "---")
            else:
                t.add_row(name, "[red]STOPPED[/red]", "---", "---", "---")
    console.print(t)

@app.command()
def health():
    """Run health checks on reachable services."""
    t = Table(title="Service Health Checks")
    t.add_column("Service")
    t.add_column("Endpoint")
    t.add_column("Result")
    
    for name, svc in SERVICES.items():
        if "health" in svc:
            ok = check_http_health(svc["health"])
            t.add_row(name, svc["health"], "[green]PASS[/green]" if ok else "[red]FAIL[/red]")
        else:
            t.add_row(name, "N/A", "[blue]SKIP[/blue]")
    console.print(t)

@app.command()
def logs(service: str = Argument(None, help="Service name (api, worker, etc.)")):
    """Tail logs for one or all services."""
    if service:
        files = [LOG_DIR / f"{service}.log"]
    else:
        files = list(LOG_DIR.glob("*.log"))
        
    if not files or not any(f.exists() for f in files):
        console.print("[warning]No log files found.[/warning]")
        return
        
    cmd = ["tail", "-f"] if platform.system() != "Windows" else ["powershell", "Get-Content", "-Wait", "-Tail", "20"]
    try:
        subprocess.run(cmd + [str(f) for f in files if f.exists()])
    except KeyboardInterrupt:
        pass

@app.command()
def clean(logs: bool = Option(False, help="Also remove log files")):
    """Clean up build artifacts and temporary files."""
    patterns = ["**/__pycache__", "**/*.pyc", "dist_agent", ".pytest_cache", ".ruff_cache", "**/node_modules/.vite"]
    if logs:
        patterns.append(".synqx/logs/*.log")
        
    removed_count = 0
    for p in patterns:
        for path in (ROOT_DIR.rglob(p.split('/')[-1]) if '/' in p else ROOT_DIR.rglob(p)):
            try:
                if path.is_dir():
                    shutil.rmtree(path)
                    removed_count += 1
                elif path.is_file():
                    path.unlink()
                    removed_count += 1
            except Exception:
                pass
    console.print(f"[success]✓ Cleaned {removed_count} items.[/success]")

# --- DB Commands ---
@db_app.command("migrate")
def db_migrate():
    """Apply database migrations to current HEAD."""
    bin_path = get_venv_bin(ROOT_DIR/"backend", "alembic")
    run([bin_path, "upgrade", "head"], ROOT_DIR/"backend")
    console.print("[success]✓ Database migrated to HEAD.[/success]")

@db_app.command("revision")
def db_rev(message: str = Option(None, "-m", help="Migration message")):
    """Create a new database migration revision."""
    msg = message or f"auto_{datetime.now().strftime('%Y%m%d_%H%M')}"
    bin_path = get_venv_bin(ROOT_DIR/"backend", "alembic")
    run([bin_path, "revision", "--autogenerate", "-m", msg], ROOT_DIR/"backend")

@db_app.command("rollback")
def db_roll(steps: int = Argument(1, help="Number of steps to rollback")):
    """Rollback database migrations."""
    bin_path = get_venv_bin(ROOT_DIR/"backend", "alembic")
    run([bin_path, "downgrade", f"-{steps}"], ROOT_DIR/"backend")

# --- Build Commands ---
@build_app.command("agent")
def build_agent(version: str = "1.0.0"):
    """Build a portable SynqX Agent tarball."""
    # Build-time staging area
    build_staging = ROOT_DIR / "dist_agent"
    if build_staging.exists():
        shutil.rmtree(build_staging)
    build_staging.mkdir(parents=True)
    
    # Final distribution directory
    dist_dir = ROOT_DIR / "dist" / "agents"
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    pkgs = build_staging / "packages"
    pkgs.mkdir()
    
    # Build internal libs as wheels
    for lib in ["synqx-core", "synqx-engine"]:
        console.print(f"[info]Building {lib}...[/info]")
        run([sys.executable, "-m", "build", "--wheel", "--outdir", str(pkgs)], ROOT_DIR/"libs"/lib)
    
    # Copy agent source
    console.print("[info]Packaging agent source...[/info]")
    shutil.copytree(
        ROOT_DIR/"agent", 
        build_staging, 
        dirs_exist_ok=True, 
        ignore=shutil.ignore_patterns(".venv", "__pycache__", ".env", "*.pid", "*.log")
    )
    
    # Clean pyproject.toml of local paths for distribution
    p = build_staging / "pyproject.toml"
    if p.exists():
        content = p.read_text()
        # Remove local path dependencies and uv sources
        content = re.sub(r'("synqx-(core|engine)",?\s*\n?)|(\[tool\.uv\.sources\][\s\S]*?(?=\n\[|\Z))', '', content)
        p.write_text(content)
    
    # Create archive in dist/agents
    archive_name = f"synqx-agent-v{version}.tar.gz"
    art = dist_dir / archive_name
    console.print(f"[info]Creating archive {archive_name}...[/info]")
    
    with tarfile.open(art, "w:gz") as tar:
        tar.add(build_staging, arcname=f"synqx-agent-{version}")
        
    # Generate checksum
    checksum_file = art.parent / (art.name + ".sha256")
    checksum_file.write_text(f"{calculate_checksum(art)}  {art.name}\n")
    
    # Create 'latest' copy
    shutil.copy(art, dist_dir / "synqx-agent-latest.tar.gz")
    shutil.copy(checksum_file, dist_dir / "synqx-agent-latest.tar.gz.sha256")
    
    console.print(f"[success]✓ Build complete: {art}[/success]")

@rel_app.command("list")
def rel_list():
    """List all available agent releases."""
    dist_dir = ROOT_DIR / "dist" / "agents"
    if not dist_dir.exists():
        console.print("[warning]No releases found in dist/agents[/warning]")
        return

    t = Table(box=box.SIMPLE)
    t.add_column("Version")
    t.add_column("Size")
    t.add_column("Date")
    
    for f in sorted(dist_dir.glob("synqx-agent-v*.tar.gz"), reverse=True):
        m = re.search(r'v(\d+\.\d+\.\d+)', f.name)
        v = m.group(1) if m else "???"
        sz = f"{f.stat().st_size/1024/1024:.2f} MB"
        dt = datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        t.add_row(v, sz, dt)
    console.print(t)

@rel_app.command("bump")
def rel_bump(part: str = Argument(..., help="major, minor, or_patch")):
    """Bump version across all components."""
    files = [
        ROOT_DIR / "agent" / "pyproject.toml", 
        ROOT_DIR / "libs" / "synqx-core" / "pyproject.toml", 
        ROOT_DIR / "libs" / "synqx-engine" / "pyproject.toml"
    ]
    
    content = files[0].read_text()
    match = re.search(r'version\s*=\s*"(.*?)"', content)
    if not match:
        console.print("[error]Could not find version in pyproject.toml[/error]")
        return
        
    cur = match.group(1)
    v = list(map(int, cur.split('.')))
    
    if part == "major":
        v[0] += 1
        v[1] = 0
        v[2] = 0
    elif part == "minor":
        v[1] += 1
        v[2] = 0
    elif part == "patch":
        v[2] += 1
    else:
        console.print("[error]Invalid part. Use major, minor, or patch.[/error]")
        return
        
    new_version = ".".join(map(str, v))
    console.print(f"[info]Bumping version: {cur} -> {new_version}[/info]")
    
    for f in files:
        if f.exists():
            f.write_text(re.sub(r'version\s*=\s*".*?"', f'version = "{new_version}"', f.read_text()))
            
    # Trigger a build
    build_agent(new_version)

@cfg_app.command("show")
def cfg_show():
    """Display current configuration."""
    console.print(Panel(json.dumps(config._data, indent=2), title="SynqX Config"))

if __name__ == "__main__":
    app()
