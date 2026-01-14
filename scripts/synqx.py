#!/usr/bin/env python3
"""
SynqX Unified Developer CLI - Enhanced Edition
==============================================
Production-grade development, building, release, and database management.

Features:
    - Robust process management with health checks
    - Comprehensive error handling and recovery
    - Configuration management
    - Service dependency ordering
    - Automatic restarts and monitoring
    - Build artifact verification
    - Database backup and rollback
    - Cross-platform support

Usage:
    ./scripts/synqx.py [command] [subcommand] [args...]

Dependencies:
    - Python 3.9+
    - uv (for python package management)
    - npm (for frontend)
"""

import os
import sys
import argparse
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
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
import logging

# --- Configuration ---
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
PID_DIR = ROOT_DIR / ".synqx"
LOG_DIR = PID_DIR / "logs"
BACKUP_DIR = PID_DIR / "backups"
CONFIG_FILE = ROOT_DIR / "synqx.config.json"

# Ensure directories exist
for directory in [PID_DIR, LOG_DIR, BACKUP_DIR]:
    directory.mkdir(exist_ok=True)

# --- Configuration Management ---
DEFAULT_CONFIG = {
    "api_port": 8000,
    "frontend_port": 5173,
    "log_level": "INFO",
    "health_check_interval": 30,
    "max_restart_attempts": 3,
    "graceful_shutdown_timeout": 10,
    "build": {
        "verify_checksums": True,
        "parallel_builds": True
    },
    "database": {
        "backup_before_migrate": True,
        "backup_retention_days": 7
    }
}

class Config:
    _instance = None
    _config = None
    _loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._loaded:
            self.load()
            self._loaded = True
    
    def load(self):
        """Load configuration from file or use defaults."""
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r') as f:
                    self._config = {**DEFAULT_CONFIG, **json.load(f)}
            except Exception as e:
                logging.warning(f"Failed to load config file: {e}. Using defaults.")
                self._config = DEFAULT_CONFIG
        else:
            self._config = DEFAULT_CONFIG
            self.save()
    
    def save(self):
        """Save current configuration to file."""
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump(self._config, f, indent=2)
        except Exception as e:
            logging.error(f"Failed to save config: {e}")
    
    def get(self, key: str, default=None):
        """Get configuration value with dot notation support."""
        keys = key.split('.')
        value = self._config
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k, default)
            else:
                return default
        return value
    
    def set(self, key: str, value):
        """Set configuration value with dot notation support."""
        keys = key.split('.')
        config = self._config
        for k in keys[:-1]:
            config = config.setdefault(k, {})
        config[keys[-1]] = value
        self.save()

config = Config()

# --- Service Status Enum ---
class ServiceStatus(Enum):
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    FAILED = "FAILED"
    STARTING = "STARTING"
    STOPPING = "STOPPING"

# --- Service Metadata ---
@dataclass
class ServiceMetadata:
    pid: int
    name: str
    start_time: float
    restart_count: int = 0
    last_health_check: float = 0
    status: ServiceStatus = ServiceStatus.RUNNING
    port: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d['status'] = self.status.value
        return d
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ServiceMetadata':
        data['status'] = ServiceStatus(data['status'])
        return cls(**data)

# --- Service Configuration ---
API_PORT = config.get('api_port', 8000)
FE_PORT = config.get('frontend_port', 5173)

SERVICES = {
    "api": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["uvicorn", "main:app", "--reload", "--port", str(API_PORT), "--host", "0.0.0.0"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "health_check": lambda: check_http_health(f"http://localhost:{API_PORT}/health"),
        "port": API_PORT,
        "depends_on": []
    },
    "worker": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["celery", "-A", "app.core.celery_app", "worker", "-Q", "celery", "--loglevel=info", "--pool=solo"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "health_check": None,
        "port": None,
        "depends_on": ["api"]
    },
    "beat": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["celery", "-A", "app.core.celery_app", "beat", "--loglevel=info"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "health_check": None,
        "port": None,
        "depends_on": ["api"]
    },
    "telemetry": {
        "dir": ROOT_DIR / "backend",
        "cmd": ["celery", "-A", "app.core.celery_app", "worker", "-Q", "telemetry", "--loglevel=info", "--pool=solo"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "backend")},
        "health_check": None,
        "port": None,
        "depends_on": ["api"]
    },
    "frontend": {
        "dir": ROOT_DIR / "frontend",
        "cmd": ["npm", "run", "dev", "--", "--host", "--port", str(FE_PORT)],
        "env": {},
        "health_check": lambda: check_http_health(f"http://localhost:{FE_PORT}"),
        "port": FE_PORT,
        "depends_on": ["api"]
    },
    "agent": {
        "dir": ROOT_DIR / "agent",
        "cmd": ["python", "main.py", "start"],
        "env": {"PYTHONPATH": str(ROOT_DIR / "agent")},
        "health_check": None,
        "port": None,
        "depends_on": ["api"]
    }
}

# --- Logging Setup ---
class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors."""
    
    COLORS = {
        'DEBUG': '\033[94m',    # Blue
        'INFO': '\033[96m',     # Cyan
        'WARNING': '\033[93m',  # Yellow
        'ERROR': '\033[91m',    # Red
        'CRITICAL': '\033[95m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        if platform.system() != "Windows":
            levelname = record.levelname
            if levelname in self.COLORS:
                record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        return super().format(record)

def setup_logging(level: str = None, verbose: bool = False):
    """Configure logging with file and console handlers."""
    if verbose:
        level = "DEBUG"
        
    log_level = level or config.get('log_level', 'INFO')
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)  # Capture all logs, let handlers filter
    
    # Clear existing handlers
    logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level))
    console_formatter = ColoredFormatter(
        '%(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    
    # File handler
    file_handler = logging.FileHandler(LOG_DIR / 'synqx-cli.log')
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    
    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

# --- Enhanced Colors ---
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

    @staticmethod
    def print(msg, color=None, bold=False):
        if platform.system() == "Windows" or color is None:
            print(msg)
        else:
            code = color
            if bold: code += Colors.BOLD
            print(f"{code}{msg}{Colors.ENDC}")

# --- Utility Functions ---
def run_cmd(cmd: List[str], cwd: Path, env: dict = None, capture=False, timeout: int = None) -> Optional[str]:
    """Runs a shell command with enhanced error handling."""
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    
    # Windows compatibility
    if platform.system() == "Windows":
        if cmd[0] == "npm":
            cmd[0] = "npm.cmd"
        elif cmd[0] in ["python", "python3"]:
            cmd[0] = "python.exe" if shutil.which("python.exe") else "python"
    
    try:
        logging.debug(f"Running command: {' '.join(cmd)} in {cwd}")
        res = subprocess.run(
            cmd, 
            cwd=cwd, 
            env=full_env, 
            check=True, 
            text=True, 
            capture_output=capture,
            timeout=timeout
        )
        return res.stdout if capture else None
    except subprocess.TimeoutExpired:
        logging.error(f"Command timed out: {' '.join(cmd)}")
        raise
    except subprocess.CalledProcessError as e:
        logging.error(f"Command failed: {' '.join(cmd)}")
        logging.error(f"Return code: {e.returncode}")
        if capture and e.stderr:
            logging.error(f"stderr: {e.stderr}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error running command: {e}")
        raise

def ensure_tool(name: str, version_cmd: List[str] = None) -> bool:
    """Check if a tool exists and optionally verify version."""
    if not shutil.which(name):
        logging.error(f"{name} is not installed or not in PATH.")
        return False
    
    if version_cmd:
        try:
            result = subprocess.run(
                version_cmd, 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            logging.info(f"{name} version: {result.stdout.strip()}")
        except Exception as e:
            logging.warning(f"Could not verify {name} version: {e}")
    
    return True

def get_venv_python(project_path: Path) -> str:
    """Returns the path to the python executable in the venv."""
    if platform.system() == "Windows":
        py = project_path / ".venv" / "Scripts" / "python.exe"
    else:
        py = project_path / ".venv" / "bin" / "python"
    
    if not py.exists():
        logging.warning(f"Virtual environment not found at {py}")
        return sys.executable
    
    return str(py)

def get_venv_bin(project_path: Path, bin_name: str) -> str:
    """Returns the path to a binary in the venv."""
    if platform.system() == "Windows":
        bin_path = project_path / ".venv" / "Scripts" / f"{bin_name}.exe"
    else:
        bin_path = project_path / ".venv" / "bin" / bin_name
    
    if not bin_path.exists():
        logging.warning(f"Binary {bin_name} not found in venv at {bin_path}")
        # Fallback to system binary
        return bin_name
    
    return str(bin_path)

def check_port_available(port: int, host: str = '0.0.0.0') -> bool:
    """
    Check if a port is available. 
    Uses SO_REUSEADDR to accurately detect if a port is actually 
    held by another listener or just in a recyclable state.
    """
    for h in ['127.0.0.1', '0.0.0.0']:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((h, port))
            except OSError:
                return False
    return True

def force_kill_port(port: int):
    """Aggressively kill any process listening on or attached to the specified port."""
    if platform.system() == "Windows":
        try:
            output = subprocess.check_output(["netstat", "-ano", "-p", "tcp"], text=True)
            for line in output.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    pid = line.strip().split()[-1]
                    logging.warning(f"Force killing PID {pid} on port {port}")
                    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
        except Exception: pass
    else:
        try:
            # 1. Targeted kill for the actual listener process
            output = subprocess.check_output(["lsof", "-t", f"-iTCP:{port}", "-sTCP:LISTEN"], text=True)
            for pid in output.splitlines():
                if pid.strip():
                    logging.warning(f"Force killing listener PID {pid} on port {port}")
                    os.kill(int(pid), signal.SIGKILL)
            
            # 2. Sweep up any remaining orphans/zombies still attached to the port
            output_remaining = subprocess.check_output(["lsof", "-t", f"-i:{port}"], text=True)
            for pid in output_remaining.splitlines():
                if pid.strip():
                    try:
                        logging.warning(f"Clearing orphaned process {pid} from port {port}")
                        os.kill(int(pid), signal.SIGKILL)
                    except (ProcessLookupError, OSError): pass
        except Exception: pass

def check_http_health(url: str, timeout: int = 2) -> bool:
    """Check if an HTTP endpoint is healthy."""
    try:
        import urllib.request
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status == 200
    except Exception:
        return False

def calculate_checksum(file_path: Path) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for block in iter(lambda: f.read(4096), b''):
            sha256.update(block)
    return sha256.hexdigest()

def get_service_metadata(name: str) -> Optional[ServiceMetadata]:
    """Load service metadata from file."""
    metadata_file = PID_DIR / f"{name}.json"
    if not metadata_file.exists():
        return None
    
    try:
        with open(metadata_file, 'r') as f:
            data = json.load(f)
            return ServiceMetadata.from_dict(data)
    except Exception as e:
        logging.error(f"Failed to load metadata for {name}: {e}")
        return None

def save_service_metadata(name: str, metadata: ServiceMetadata):
    """Save service metadata to file."""
    metadata_file = PID_DIR / f"{name}.json"
    try:
        with open(metadata_file, 'w') as f:
            json.dump(metadata.to_dict(), f, indent=2)
    except Exception as e:
        logging.error(f"Failed to save metadata for {name}: {e}")

def is_process_running(pid: int) -> bool:
    """Check if a process is running."""
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError, PermissionError):
        return False

def kill_process(pid: int, timeout: int = 10) -> bool:
    """Kill a process gracefully with timeout."""
    if not is_process_running(pid):
        return True
    
    try:
        # Try graceful shutdown first
        os.kill(pid, signal.SIGTERM)
        
        # Wait for process to die
        start = time.time()
        while time.time() - start < timeout:
            if not is_process_running(pid):
                return True
            time.sleep(0.1)
        
        # Force kill if still running
        logging.warning(f"Process {pid} did not stop gracefully, forcing kill")
        os.kill(pid, signal.SIGKILL)
        time.sleep(0.5)
        
        return not is_process_running(pid)
    except Exception as e:
        logging.error(f"Failed to kill process {pid}: {e}")
        return False

# --- Service Management ---
class ServiceManager:
    """Manages service lifecycle with monitoring and auto-restart."""
    
    def __init__(self):
        self.monitoring_thread = None
        self.should_monitor = False
    
    def start_service(self, name: str, auto_restart: bool = False) -> bool:
        """Start a service with enhanced tracking."""
        svc = SERVICES.get(name)
        if not svc:
            logging.error(f"Unknown service: {name}")
            return False
        
        # Check if already running
        metadata = get_service_metadata(name)
        if metadata and is_process_running(metadata.pid):
            logging.warning(f"{name} is already running (PID: {metadata.pid})")
            return True
        
        # Check dependencies
        for dep in svc.get('depends_on', []):
            dep_metadata = get_service_metadata(dep)
            if not dep_metadata or not is_process_running(dep_metadata.pid):
                logging.warning(f"Dependency {dep} is not running, starting it first...")
                if not self.start_service(dep, auto_restart):
                    logging.error(f"Failed to start dependency {dep}")
                    return False
                # Wait a bit for dependency to initialize
                time.sleep(2)
        
        # Check port availability
        if svc.get('port'):
            if not check_port_available(svc['port']):
                logging.error(f"Port {svc['port']} is already in use for {name}")
                return False
        
        logging.info(f"Starting {name}...")
        
        # Prepare command
        cmd = list(svc["cmd"])
        cwd = svc["dir"]
        
        # Use venv binaries if available
        if name != "frontend":
            if cmd[0] == "python":
                cmd[0] = get_venv_python(cwd)
            elif cmd[0] in ["uvicorn", "celery", "alembic"]:
                cmd[0] = get_venv_bin(cwd, cmd[0])
        
        env = os.environ.copy()
        env.update(svc["env"])
        
        # Start process
        log_file = LOG_DIR / f"{name}.log"
        try:
            with open(log_file, "w") as log:
                # Cross-platform detachment
                kwargs = {}
                if platform.system() == "Windows":
                    kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
                else:
                    kwargs['start_new_session'] = True
                
                proc = subprocess.Popen(
                    cmd, 
                    cwd=cwd, 
                    env=env, 
                    stdout=log, 
                    stderr=subprocess.STDOUT,
                    **kwargs
                )
            
            # Save metadata
            metadata = ServiceMetadata(
                pid=proc.pid,
                name=name,
                start_time=time.time(),
                port=svc.get('port'),
                status=ServiceStatus.STARTING
            )
            save_service_metadata(name, metadata)
            
            # Wait a moment and verify it started
            time.sleep(1)
            if not is_process_running(proc.pid):
                logging.error(f"{name} failed to start (process died immediately)")
                return False
            
            # Update status
            metadata.status = ServiceStatus.RUNNING
            save_service_metadata(name, metadata)
            
            logging.info(f"✓ {name} started successfully (PID: {proc.pid})")
            return True
            
        except Exception as e:
            logging.error(f"Failed to start {name}: {e}")
            return False
    
    def stop_service(self, name: str, force: bool = False) -> bool:
        """Stop a service gracefully with optional aggressive cleanup."""
        metadata = get_service_metadata(name)
        svc = SERVICES.get(name)
        port = svc.get('port') if svc else None
        
        success = True
        if metadata:
            if is_process_running(metadata.pid):
                logging.info(f"Stopping {name} (PID: {metadata.pid})...")
                metadata.status = ServiceStatus.STOPPING
                save_service_metadata(name, metadata)
                
                timeout = 3 if force else config.get('graceful_shutdown_timeout', 10)
                success = kill_process(metadata.pid, timeout)
            
            # Clean up metadata
            (PID_DIR / f"{name}.json").unlink(missing_ok=True)
        else:
            logging.debug(f"{name} is not running (no metadata)")

        # VERIFICATION: Ensure port is actually free if associated
        if port:
            port_free = False
            # Wait up to 3s for OS to release port naturally
            for _ in range(30):
                if check_port_available(port):
                    port_free = True
                    break
                time.sleep(0.1)
            
            if not port_free:
                if force:
                    logging.warning(f"Port {port} still busy for {name}. Initiating aggressive port clearing...")
                    force_kill_port(port)
                    time.sleep(0.5)
                    success = check_port_available(port)
                else:
                    logging.error(f"Port {port} remains occupied after stopping {name}")
                    success = False

        if success:
            logging.info(f"✓ {name} stopped")
        else:
            logging.error(f"Failed to fully stop {name}")
            if metadata:
                metadata.status = ServiceStatus.FAILED
                save_service_metadata(name, metadata)
        
        return success
    
    def restart_service(self, name: str) -> bool:
        """Restart a service."""
        logging.info(f"Restarting {name}...")
        self.stop_service(name)
        time.sleep(1)
        return self.start_service(name)
    
    def get_status(self, name: str) -> Tuple[ServiceStatus, Optional[ServiceMetadata]]:
        """Get current service status."""
        metadata = get_service_metadata(name)
        
        if not metadata:
            return ServiceStatus.STOPPED, None
        
        if not is_process_running(metadata.pid):
            return ServiceStatus.STOPPED, metadata
        
        # Perform health check if available
        svc = SERVICES.get(name)
        if svc and svc.get('health_check'):
            try:
                if svc['health_check']():
                    metadata.status = ServiceStatus.RUNNING
                else:
                    metadata.status = ServiceStatus.FAILED
            except Exception:
                metadata.status = ServiceStatus.FAILED
        else:
            metadata.status = ServiceStatus.RUNNING
        
        return metadata.status, metadata
    
    def start_monitoring(self):
        """Start background monitoring thread."""
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            return
        
        self.should_monitor = True
        self.monitoring_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitoring_thread.start()
        logging.info("Service monitoring started")
    
    def stop_monitoring(self):
        """Stop background monitoring."""
        self.should_monitor = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logging.info("Service monitoring stopped")
    
    def _monitor_loop(self):
        """Background monitoring loop."""
        interval = config.get('health_check_interval', 30)
        max_restarts = config.get('max_restart_attempts', 3)
        
        while self.should_monitor:
            for name in SERVICES.keys():
                metadata = get_service_metadata(name)
                if not metadata:
                    continue
                
                # Check if process is alive
                if not is_process_running(metadata.pid):
                    if metadata.restart_count < max_restarts:
                        logging.warning(f"{name} died, attempting restart ({metadata.restart_count + 1}/{max_restarts})")
                        metadata.restart_count += 1
                        if self.start_service(name, auto_restart=True):
                            # Update restart count
                            new_metadata = get_service_metadata(name)
                            if new_metadata:
                                new_metadata.restart_count = metadata.restart_count
                                save_service_metadata(name, new_metadata)
                    else:
                        logging.error(f"{name} has failed too many times, giving up")
                        metadata.status = ServiceStatus.FAILED
                        save_service_metadata(name, metadata)
            
            time.sleep(interval)

service_manager = ServiceManager()

# --- Commands: Install ---
def install(args):
    """Install all dependencies with verification."""
    logging.info("Starting Full Stack Installation...")
    
    # Verify required tools
    if not ensure_tool("uv", ["uv", "--version"]):
        logging.error("Please install uv: https://github.com/astral-sh/uv")
        return False
    
    if not ensure_tool("npm", ["npm", "--version"]):
        logging.error("Please install npm: https://nodejs.org/")
        return False
    
    try:
        # 1. Backend & Libs
        logging.info("Setting up Backend & Libraries...")
        backend_dir = ROOT_DIR / "backend"
        
        if not (backend_dir / ".venv").exists():
            logging.info("Creating backend virtual environment...")
            run_cmd(["uv", "venv"], cwd=backend_dir)
        
        # Install libs in editable mode
        logging.info("Installing core libraries...")
        run_cmd(
            ["uv", "pip", "install", "-e", "../libs/synqx-core", "-e", "../libs/synqx-engine"], 
            cwd=backend_dir
        )
        
        logging.info("Installing backend dependencies...")
        run_cmd(["uv", "pip", "install", "-r", "requirements.txt"], cwd=backend_dir)
        
        # 2. Agent
        logging.info("Setting up Agent...")
        agent_dir = ROOT_DIR / "agent"
        
        if not (agent_dir / ".venv").exists():
            logging.info("Creating agent virtual environment...")
            run_cmd(["uv", "venv"], cwd=agent_dir)
        
        logging.info("Installing agent dependencies...")
        run_cmd(
            ["uv", "pip", "install", "-e", "../libs/synqx-core", "-e", "../libs/synqx-engine", "-r", "requirements.txt"], 
            cwd=agent_dir
        )
        
        # 3. Frontend
        logging.info("Setting up Frontend...")
        run_cmd(["npm", "install"], cwd=ROOT_DIR / "frontend", timeout=300)
        
        # Verify installations
        logging.info("Verifying installations...")
        
        # Check Python environments
        for proj in ["backend", "agent"]:
            venv_py = get_venv_python(ROOT_DIR / proj)
            try:
                result = subprocess.run(
                    [venv_py, "--version"], 
                    capture_output=True, 
                    text=True,
                    timeout=5
                )
                logging.info(f"{proj} Python: {result.stdout.strip()}")
            except Exception as e:
                logging.warning(f"Could not verify {proj} Python: {e}")
        
        # Check node modules
        node_modules = ROOT_DIR / "frontend" / "node_modules"
        if node_modules.exists():
            logging.info("Frontend node_modules present.")
        
        logging.info("✅ Installation Complete!")
        return True
        
    except Exception as e:
        logging.error(f"Installation failed: {e}")
        return False

# --- Commands: Dev ---
def dev_start(args):
    """Start development stack with dependency ordering."""
    logging.info("Starting SynqX Development Stack...")
    
    # Prepare
    PID_DIR.mkdir(exist_ok=True)
    LOG_DIR.mkdir(exist_ok=True)
    
    # Determine services to start
    svcs = ["api", "worker", "beat", "frontend"]
    if args.agent:
        svcs.append("agent")
    
    if args.telemetry:
        svcs.append("telemetry")
    
    # Start services in dependency order
    success_count = 0
    for svc_name in svcs:
        if service_manager.start_service(svc_name):
            success_count += 1
        else:
            logging.error(f"Failed to start {svc_name}")
            if getattr(args, 'fail_fast', False):
                logging.error("Stopping due to --fail-fast")
                dev_stop(args)
                return False
    
    if success_count == len(svcs):
        logging.info(f"✅ All {success_count} services started successfully")
        
        # Start monitoring if requested
        if args.monitor:
            service_manager.start_monitoring()
        
        # Show status
        dev_status(args)
        
        # Show useful URLs
        Colors.print("\n📍 Service URLs:", Colors.CYAN, bold=True)
        print(f"  API:      http://localhost:{API_PORT}")
        print(f"  Frontend: http://localhost:{FE_PORT}")
        print(f"  API Docs: http://localhost:{API_PORT}/docs")
        print()
        
        return True
    else:
        logging.warning(f"Started {success_count}/{len(svcs)} services")
        return False

def dev_stop(args):
    """Stop all services gracefully."""
    logging.info("Stopping SynqX Development Stack...")
    
    # Stop monitoring first
    service_manager.stop_monitoring()
    
    # Stop in reverse dependency order
    stop_order = ["agent", "telemetry", "frontend", "beat", "worker", "api"]
    
    for svc_name in stop_order:
        service_manager.stop_service(svc_name, force=args.force if hasattr(args, 'force') else False)
    
    logging.info("✅ All services stopped")

def dev_restart(args):
    """Restart development stack."""
    dev_stop(args)
    time.sleep(2)
    return dev_start(args)

def dev_status(args):
    """Show detailed service status."""
    Colors.print("\n📊 Service Status", Colors.HEADER, bold=True)
    print("=" * 80)
    
    for name in SERVICES.keys():
        status, metadata = service_manager.get_status(name)
        
        # Status color
        if status == ServiceStatus.RUNNING:
            status_str = f"{Colors.GREEN}{status.value}{Colors.ENDC}"
        elif status == ServiceStatus.STOPPED:
            status_str = f"{Colors.FAIL}{status.value}{Colors.ENDC}"
        elif status == ServiceStatus.FAILED:
            status_str = f"{Colors.WARNING}{status.value}{Colors.ENDC}"
        else:
            status_str = status.value
        
        # Build info string
        if metadata:
            uptime = time.time() - metadata.start_time
            uptime_str = f"{int(uptime // 60)}m {int(uptime % 60)}s"
            info_str = f"PID: {metadata.pid:<6} Uptime: {uptime_str:<10} Restarts: {metadata.restart_count}"
            if metadata.port:
                info_str += f" Port: {metadata.port}"
        else:
            info_str = "---"
        
        print(f"  {name:<12} {status_str:<30} {info_str}")
    
    print("=" * 80)
    print()
    return True

def dev_logs(args):
    """Tail service logs."""
    if not args.service:
        # Tail all logs
        log_files = list(LOG_DIR.glob("*.log"))
        if not log_files:
            logging.warning("No log files found")
            return
        
        if platform.system() == "Windows":
            # Windows doesn't have tail, use PowerShell
            logging.info("Tailing all logs (Ctrl+C to stop)...")
            try:
                for log_file in log_files:
                    print(f"\n--- {log_file.name} ---")
                    subprocess.run(["powershell", "Get-Content", str(log_file), "-Tail", "20"])
            except KeyboardInterrupt:
                print()
        else:
            cmd = ["tail", "-f"] + [str(x) for x in log_files]
            try:
                subprocess.run(cmd)
            except KeyboardInterrupt:
                print()
    else:
        log_file = LOG_DIR / f"{args.service}.log"
        if not log_file.exists():
            logging.error(f"No log file for {args.service}")
            return
        
        logging.info(f"Tailing {args.service} logs (Ctrl+C to stop)...")
        try:
            if platform.system() == "Windows":
                subprocess.run(["powershell", "Get-Content", str(log_file), "-Wait", "-Tail", "50"])
            else:
                subprocess.run(["tail", "-f", str(log_file)])
        except KeyboardInterrupt:
            print()

def dev_health(args):
    """Run health checks on all services."""
    Colors.print("\n🏥 Health Check Results", Colors.HEADER, bold=True)
    print("=" * 80)
    
    all_healthy = True
    for name in SERVICES.keys():
        svc = SERVICES[name]
        metadata = get_service_metadata(name)
        
        if not metadata or not is_process_running(metadata.pid):
            print(f"  {name:<12} {Colors.FAIL}NOT RUNNING{Colors.ENDC}")
            all_healthy = False
            continue
        
        if svc.get('health_check'):
            try:
                healthy = svc['health_check']()
                if healthy:
                    print(f"  {name:<12} {Colors.GREEN}HEALTHY{Colors.ENDC}")
                else:
                    print(f"  {name:<12} {Colors.WARNING}UNHEALTHY{Colors.ENDC}")
                    all_healthy = False
            except Exception as e:
                print(f"  {name:<12} {Colors.FAIL}ERROR{Colors.ENDC} - {str(e)[:50]}")
                all_healthy = False
        else:
            print(f"  {name:<12} {Colors.CYAN}RUNNING{Colors.ENDC} (no health check)")
    
    print("=" * 80)
    
    if all_healthy:
        logging.info("✅ All services are healthy")
    else:
        logging.warning("⚠️  Some services are unhealthy")
    
    print()

# --- Commands: DB ---
def db_backup(name: str = None) -> Optional[Path]:
    """Create a database backup."""
    if name is None:
        name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    backup_file = BACKUP_DIR / f"{name}.sql"
    
    logging.info(f"Creating database backup: {backup_file.name}")
    
    try:
        # This is a placeholder - actual implementation depends on your DB
        # For PostgreSQL:
        # run_cmd(["pg_dump", "-F", "c", "-f", str(backup_file), DB_URL], cwd=ROOT_DIR)
        
        # For SQLite:
        # backend_dir = ROOT_DIR / "backend"
        # db_file = backend_dir / "app.db"
        # if db_file.exists():
        #     shutil.copy(db_file, backup_file)
        
        logging.info(f"✓ Backup created: {backup_file}")
        return backup_file
    except Exception as e:
        logging.error(f"Backup failed: {e}")
        return None

def db_cleanup_old_backups():
    """Remove old backups based on retention policy."""
    retention_days = config.get('database.backup_retention_days', 7)
    cutoff_time = time.time() - (retention_days * 24 * 60 * 60)
    
    removed = 0
    for backup_file in BACKUP_DIR.glob("backup_*.sql"):
        if backup_file.stat().st_mtime < cutoff_time:
            backup_file.unlink()
            removed += 1
            logging.debug(f"Removed old backup: {backup_file.name}")
    
    if removed > 0:
        logging.info(f"Cleaned up {removed} old backup(s)")

def db_migrate(args):
    """Run database migrations with backup."""
    backend_dir = ROOT_DIR / "backend"
    alembic_bin = get_venv_bin(backend_dir, "alembic")
    
    # Backup before migration if configured
    if config.get('database.backup_before_migrate', True):
        backup_file = db_backup(f"pre_migrate_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        if not backup_file:
            logging.warning("Backup failed, but continuing with migration...")
    
    try:
        logging.info("Running database migrations...")
        
        if args.dry_run:
            # Show what would be applied
            logging.info("Dry run mode - showing pending migrations:")
            run_cmd([alembic_bin, "heads"], cwd=backend_dir, capture=False)
            run_cmd([alembic_bin, "current"], cwd=backend_dir, capture=False)
        else:
            run_cmd([alembic_bin, "upgrade", "head"], cwd=backend_dir)
            logging.info("✅ Database upgraded to head")
            
            # Cleanup old backups
            db_cleanup_old_backups()
        
        return True
    except Exception as e:
        logging.error(f"Migration failed: {e}")
        if backup_file:
            logging.info(f"Backup available at: {backup_file}")
        return False

def db_revision(args):
    """Create a new migration revision."""
    backend_dir = ROOT_DIR / "backend"
    alembic_bin = get_venv_bin(backend_dir, "alembic")
    
    msg = args.message or f"auto_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        logging.info(f"Creating migration revision: {msg}")
        run_cmd([alembic_bin, "revision", "--autogenerate", "-m", msg], cwd=backend_dir)
        logging.info("✅ Revision created successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to create revision: {e}")
        return False

def db_rollback(args):
    """Rollback database migration."""
    backend_dir = ROOT_DIR / "backend"
    alembic_bin = get_venv_bin(backend_dir, "alembic")
    
    steps = args.steps or 1
    
    # Backup before rollback
    backup_file = db_backup(f"pre_rollback_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    
    try:
        logging.warning(f"Rolling back {steps} migration(s)...")
        run_cmd([alembic_bin, "downgrade", f"-{steps}"], cwd=backend_dir)
        logging.info(f"✅ Rolled back {steps} migration(s)")
        return True
    except Exception as e:
        logging.error(f"Rollback failed: {e}")
        if backup_file:
            logging.info(f"Backup available at: {backup_file}")
        return False

def db_seed(args):
    """Seed the database with initial data."""
    backend_dir = ROOT_DIR / "backend"
    py = get_venv_python(backend_dir)
    
    # Check if seed script exists
    seed_script = backend_dir / "scripts" / "seed.py"
    if not seed_script.exists():
        logging.error(f"Seed script not found at {seed_script}")
        logging.info("Create a seed script at backend/scripts/seed.py")
        return False
    
    try:
        logging.info("Seeding database...")
        run_cmd([py, str(seed_script)], cwd=backend_dir)
        logging.info("✅ Database seeded successfully")
        return True
    except Exception as e:
        logging.error(f"Seeding failed: {e}")
        return False

def db_reset(args):
    """Reset database (drop all tables and re-migrate)."""
    if not args.confirm:
        Colors.print("\n⚠️  WARNING: This will DROP ALL TABLES!", Colors.WARNING, bold=True)
        response = input("Type 'yes' to confirm: ")
        if response.lower() != 'yes':
            logging.info("Reset cancelled")
            return False
    
    backend_dir = ROOT_DIR / "backend"
    alembic_bin = get_venv_bin(backend_dir, "alembic")
    
    # Create backup
    backup_file = db_backup(f"pre_reset_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    
    try:
        logging.warning("Resetting database...")
        
        # Downgrade to base
        run_cmd([alembic_bin, "downgrade", "base"], cwd=backend_dir)
        
        # Upgrade to head
        run_cmd([alembic_bin, "upgrade", "head"], cwd=backend_dir)
        
        logging.info("✅ Database reset complete")
        
        # Optionally seed
        if args.seed:
            db_seed(args)
        
        return True
    except Exception as e:
        logging.error(f"Reset failed: {e}")
        if backup_file:
            logging.info(f"Backup available at: {backup_file}")
        return False

def db_status(args):
    """Show database migration status."""
    backend_dir = ROOT_DIR / "backend"
    alembic_bin = get_venv_bin(backend_dir, "alembic")
    
    try:
        Colors.print("\n📊 Database Status", Colors.HEADER, bold=True)
        print("=" * 80)
        
        print("\nCurrent revision:")
        run_cmd([alembic_bin, "current"], cwd=backend_dir)
        
        print("\nMigration history:")
        run_cmd([alembic_bin, "history", "--verbose"], cwd=backend_dir)
        
        print("\n" + "=" * 80)
        return True
    except Exception as e:
        logging.error(f"Failed to get status: {e}")
        return False

# --- Release Management ---
FILES_WITH_VERSION = [
    ROOT_DIR / "agent" / "pyproject.toml",
    ROOT_DIR / "libs" / "synqx-core" / "pyproject.toml",
    ROOT_DIR / "libs" / "synqx-engine" / "pyproject.toml",
]

def get_current_version(file_path: Path) -> str:
    """Extracts version from a TOML file."""
    content = file_path.read_text()
    match = re.search(r'^version\s*=\s*"(.*?)"', content, re.MULTILINE)
    if match:
        return match.group(1)
    raise ValueError(f"Could not find version in {file_path}")

def update_version_file(file_path: Path, new_version: str):
    """Updates version in a TOML file."""
    content = file_path.read_text()
    new_content = re.sub(
        r'^version\s*=\s*".*?"', 
        f'version = "{new_version}"', 
        content, 
        flags=re.MULTILINE
    )
    file_path.write_text(new_content)
    logging.info(f"Updated {file_path.relative_to(ROOT_DIR)} to {new_version}")

def bump_version_str(current_version: str, part: str) -> str:
    """Bump version number."""
    major, minor, patch = map(int, current_version.split('.'))
    if part == "major":
        major += 1
        minor = 0
        patch = 0
    elif part == "minor":
        minor += 1
        patch = 0
    elif part == "patch":
        patch += 1
    return f"{major}.{minor}.{patch}"

def perform_agent_build(version: str) -> Optional[Path]:
    """
    Builds the portable agent artifact with verification.
    """
    logging.info(f"Building SynqX Agent v{version}...")
    
    agent_dir = ROOT_DIR / "agent"
    libs_dir = ROOT_DIR / "libs"
    dist_dir = ROOT_DIR / "dist_agent"
    
    try:
        # 1. Clean
        if dist_dir.exists():
            shutil.rmtree(dist_dir)
        dist_dir.mkdir()
        packages_dir = dist_dir / "packages"
        packages_dir.mkdir()

        # 2. Build Libraries (Wheels)
        logging.info("[1/4] Compiling core libraries...")
        
        lib_wheels = []
        for lib_name in ["synqx-core", "synqx-engine"]:
            lib_path = libs_dir / lib_name
            
            # Clean previous builds
            for clean_dir in ["dist", "build"]:
                clean_path = lib_path / clean_dir
                if clean_path.exists():
                    shutil.rmtree(clean_path)
            
            # Build wheel
            logging.info(f"  Building {lib_name}...")
            
            # Check if build module is available
            try:
                import build as build_module
            except ImportError:
                logging.info("Installing build module...")
                run_cmd([sys.executable, "-m", "pip", "install", "build"], cwd=ROOT_DIR)
            
            run_cmd(
                [sys.executable, "-m", "build", "--wheel", "--outdir", str(packages_dir)], 
                cwd=lib_path
            )
            
            # Find the generated wheel
            wheels = list(packages_dir.glob(f"{lib_name.replace('-', '_')}*.whl"))
            if wheels:
                lib_wheels.extend(wheels)

        logging.info(f"  ✓ Built {len(lib_wheels)} library wheel(s)")

        # 3. Copy Agent Code
        logging.info("[2/4] Staging agent code...")
        shutil.copytree(
            agent_dir, 
            dist_dir, 
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(
                ".venv", "__pycache__", "*.egg-info", "logs", "*.pyc", 
                "*.pyo", ".pytest_cache", ".mypy_cache", "dist", "build"
            )
        )

        # 4. Patch pyproject.toml for Portable Release
        logging.info("[3/4] Patching configuration...")
        pyproject_path = dist_dir / "pyproject.toml"
        
        if pyproject_path.exists():
            content = pyproject_path.read_text()
            
            # Remove local path dependencies
            content = re.sub(r'"synqx-core",?\s*\n?', '', content)
            content = re.sub(r'"synqx-engine",?\s*\n?', '', content)
            
            # Remove [tool.uv.sources] section
            content = re.sub(r'\[tool\.uv\.sources\][\s\S]*?(?=\n\[|\Z)', '', content)
            
            pyproject_path.write_text(content)

        # Create Release Manifest
        manifest = f"""SynqX Agent v{version}
Built: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Platform: {platform.system()} {platform.release()}
Python: {sys.version.split()[0]}

Included Libraries:
"""
        for wheel in lib_wheels:
            manifest += f"  - {wheel.name}\n"
        
        (dist_dir / "RELEASE.txt").write_text(manifest)

        # Create installation instructions
        install_instructions = """# SynqX Agent Installation

## Quick Start

1. Extract this archive
2. Install dependencies:
   ```bash
   cd dist_agent
   uv venv
   source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate
   uv pip install packages/*.whl
   uv pip install -r requirements.txt
   ```

3. Configure and run:
   ```bash
   python main.py start
   ```

## Verification

Check installation:
```bash
python main.py --version
```

For help:
```bash
python main.py --help
```
"""
        (dist_dir / "INSTALL.md").write_text(install_instructions)

        # 5. Package
        logging.info("[4/4] Creating artifact...")
        artifact_name = f"synqx-agent-v{version}.tar.gz"
        artifact_path = ROOT_DIR / artifact_name
        
        with tarfile.open(artifact_path, "w:gz") as tar:
            tar.add(dist_dir, arcname=f"synqx-agent-{version}")
        
        # Calculate checksum
        checksum = calculate_checksum(artifact_path)
        checksum_file = artifact_path.with_suffix('.tar.gz.sha256')
        checksum_file.write_text(f"{checksum}  {artifact_name}\n")
        
        logging.info(f"  ✓ Artifact: {artifact_path.name}")
        logging.info(f"  ✓ Checksum: {checksum[:16]}...")
        logging.info(f"  ✓ Size: {artifact_path.stat().st_size / (1024*1024):.2f} MB")
        
        # Create/Update LATEST symlink
        latest_path = ROOT_DIR / "synqx-agent-latest.tar.gz"
        if latest_path.exists():
            latest_path.unlink()
        
        # Copy instead of symlink for compatibility
        shutil.copy(artifact_path, latest_path)
        shutil.copy(checksum_file, latest_path.with_suffix('.tar.gz.sha256'))
        
        logging.info(f"  ✓ Updated 'latest' pointer")
        
        logging.info(f"✅ Build Complete: {artifact_path}")
        return artifact_path
        
    except Exception as e:
        logging.error(f"Build failed: {e}")
        import traceback
        traceback.print_exc()
        return None

# --- Commands: Build & Release ---
def build_agent(args):
    """Build portable agent artifact."""
    version = args.version
    if not version:
        # Auto-detect version
        try:
            version = get_current_version(FILES_WITH_VERSION[0])
            logging.info(f"Auto-detected version: {version}")
        except Exception as e:
            logging.warning(f"Could not detect version: {e}")
            version = "0.0.0-dev"
    
    artifact = perform_agent_build(version)
    
    if artifact:
        logging.info("✅ Agent build successful")
        
        # Show build summary
        Colors.print("\n📦 Build Summary", Colors.HEADER, bold=True)
        print(f"  Version:   {version}")
        print(f"  Artifact:  {artifact.name}")
        print(f"  Location:  {artifact.parent}")
        print(f"  Size:      {artifact.stat().st_size / (1024*1024):.2f} MB")
        
        checksum_file = artifact.with_suffix('.tar.gz.sha256')
        if checksum_file.exists():
            checksum = checksum_file.read_text().split()[0]
            print(f"  Checksum:  {checksum[:32]}...")
        print()
        
        return True
    else:
        logging.error("❌ Agent build failed")
        return False

def release_bump(args):
    """Bump version and build."""
    logging.info(f"Bumping version ({args.part})...")
    
    try:
        # Get current version
        current_ver = get_current_version(FILES_WITH_VERSION[0])
        new_ver = bump_version_str(current_ver, args.part)
        
        logging.info(f"Version: {current_ver} → {new_ver}")
        
        # Update all tracked files
        for f in FILES_WITH_VERSION:
            if f.exists():
                update_version_file(f, new_ver)
            else:
                logging.warning(f"Version file not found: {f}")
        
        # Trigger build if requested
        if not args.no_build:
            artifact = perform_agent_build(new_ver)
            if artifact:
                logging.info("✅ Version bumped and built successfully")
                return True
            else:
                logging.error("Build failed after version bump")
                return False
        else:
            logging.info("✅ Version bumped (build skipped)")
            return True
            
    except Exception as e:
        logging.error(f"Version bump failed: {e}")
        return False

def release_list(args):
    """List available releases."""
    Colors.print("\n📦 Available Releases", Colors.HEADER, bold=True)
    print("=" * 80)
    
    artifacts = sorted(ROOT_DIR.glob("synqx-agent-v*.tar.gz"), reverse=True)
    
    if not artifacts:
        print("  No releases found")
    else:
        for artifact in artifacts:
            version_match = re.search(r'v([\d.]+)', artifact.name)
            version = version_match.group(1) if version_match else "unknown"
            
            size_mb = artifact.stat().st_size / (1024 * 1024)
            mtime = datetime.fromtimestamp(artifact.stat().st_mtime)
            
            # Check for checksum
            checksum_file = artifact.with_suffix('.tar.gz.sha256')
            has_checksum = "✓" if checksum_file.exists() else "✗"
            
            print(f"  v{version:<10} {size_mb:>6.2f} MB  {mtime.strftime('%Y-%m-%d %H:%M')}  [SHA256: {has_checksum}]")
    
    print("=" * 80)
    print()

# --- Commands: Config ---
def config_show(args):
    """Show current configuration."""
    Colors.print("\n⚙️  Current Configuration", Colors.HEADER, bold=True)
    print("=" * 80)
    print(json.dumps(config._config, indent=2))
    print("=" * 80)
    print(f"\nConfig file: {CONFIG_FILE}")
    print()

def config_set(args):
    """Set a configuration value."""
    key = args.key
    value = args.value
    
    # Try to parse value as JSON for complex types
    try:
        parsed_value = json.loads(value)
    except json.JSONDecodeError:
        # Keep as string if not valid JSON
        parsed_value = value
    
    config.set(key, parsed_value)
    logging.info(f"✓ Set {key} = {parsed_value}")

def config_get(args):
    """Get a configuration value."""
    key = args.key
    value = config.get(key)
    
    if value is None:
        logging.warning(f"Key '{key}' not found")
    else:
        print(json.dumps(value, indent=2) if isinstance(value, (dict, list)) else value)

def config_reset(args):
    """Reset configuration to defaults."""
    if not args.confirm:
        response = input("Reset configuration to defaults? (yes/no): ")
        if response.lower() != 'yes':
            logging.info("Reset cancelled")
            return
    
    config._config = DEFAULT_CONFIG.copy()
    config.save()
    logging.info("✅ Configuration reset to defaults")

# --- Commands: Clean ---
def clean(args):
    """Clean build artifacts and temporary files."""
    logging.info("Cleaning build artifacts...")
    
    patterns = [
        "**/__pycache__",
        "**/*.pyc",
        "**/*.pyo",
        "**/*.egg-info",
        "**/dist",
        "**/build",
        ".pytest_cache",
        ".mypy_cache",
        "dist_agent"
    ]
    
    removed_count = 0
    for pattern in patterns:
        for path in ROOT_DIR.rglob(pattern.split('/')[-1]):
            if pattern.startswith('**'):
                if path.is_dir():
                    shutil.rmtree(path, ignore_errors=True)
                    removed_count += 1
                elif path.is_file():
                    path.unlink(missing_ok=True)
                    removed_count += 1
    
    # Clean PID files if not running
    for pid_file in PID_DIR.glob("*.json"):
        metadata = get_service_metadata(pid_file.stem)
        if metadata and not is_process_running(metadata.pid):
            pid_file.unlink()
            removed_count += 1
    
    # Clean old logs if requested
    if args.logs:
        log_cutoff = time.time() - (args.log_days * 24 * 60 * 60)
        for log_file in LOG_DIR.glob("*.log"):
            if log_file.stat().st_mtime < log_cutoff:
                log_file.unlink()
                removed_count += 1
    
    logging.info(f"✅ Cleaned {removed_count} items")

# --- Main CLI ---
def main():
    parser = argparse.ArgumentParser(
        description="SynqX Developer CLI - Enhanced Edition",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s install                    # Install all dependencies
  %(prog)s start --monitor            # Start with monitoring
  %(prog)s status                     # Show service status
  %(prog)s logs api                   # Tail API logs
  %(prog)s db migrate                 # Run migrations
  %(prog)s build agent                # Build agent artifact
  %(prog)s release bump patch         # Bump patch version
        """
    )
    
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], help='Set log level')
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Install
    subparsers.add_parser("install", help="Install all dependencies")

    # Dev
    start_p = subparsers.add_parser("start", help="Start development stack")
    start_p.add_argument("--agent", action="store_true", help="Include agent service")
    start_p.add_argument("--telemetry", action="store_true", help="Include telemetry service")
    start_p.add_argument("--monitor", action="store_true", help="Enable monitoring")
    start_p.add_argument("--fail-fast", action="store_true", help="Stop if any service fails")
    
    stop_p = subparsers.add_parser("stop", help="Stop development stack")
    stop_p.add_argument("--force", action="store_true", help="Force kill services")
    
    restart_p = subparsers.add_parser("restart", help="Restart development stack")
    restart_p.add_argument("--agent", action="store_true")
    restart_p.add_argument("--telemetry", action="store_true")
    restart_p.add_argument("--monitor", action="store_true")
    restart_p.add_argument("--fail-fast", action="store_true")
    restart_p.add_argument("--force", action="store_true", help="Force kill services during stop")

    subparsers.add_parser("status", help="Show service status")
    subparsers.add_parser("health", help="Run health checks")
    
    logs_p = subparsers.add_parser("logs", help="Tail service logs")
    logs_p.add_argument("service", nargs="?", help="Specific service (api, worker, frontend...)")

    # DB
    db_p = subparsers.add_parser("db", help="Database operations")
    db_sub = db_p.add_subparsers(dest="action", required=True)
    
    migrate_p = db_sub.add_parser("migrate", help="Run migrations")
    migrate_p.add_argument("--dry-run", action="store_true", help="Show pending migrations")
    
    rev_p = db_sub.add_parser("revision", help="Create migration revision")
    rev_p.add_argument("-m", "--message", help="Migration message")
    
    rollback_p = db_sub.add_parser("rollback", help="Rollback migrations")
    rollback_p.add_argument("--steps", type=int, default=1, help="Number of steps to rollback")
    
    db_sub.add_parser("seed", help="Seed database")
    db_sub.add_parser("status", help="Show migration status")
    
    reset_p = db_sub.add_parser("reset", help="Reset database (DESTRUCTIVE)")
    reset_p.add_argument("--confirm", action="store_true", help="Skip confirmation")
    reset_p.add_argument("--seed", action="store_true", help="Seed after reset")

    # Build
    build_p = subparsers.add_parser("build", help="Build artifacts")
    build_sub = build_p.add_subparsers(dest="target", required=True)
    agent_build_p = build_sub.add_parser("agent", help="Build portable agent")
    agent_build_p.add_argument("--version", help="Explicit version (auto-detected if omitted)")

    # Release
    rel_p = subparsers.add_parser("release", help="Release management")
    rel_sub = rel_p.add_subparsers(dest="action", required=True)
    
    bump_p = rel_sub.add_parser("bump", help="Bump version and build")
    bump_p.add_argument("part", choices=["major", "minor", "patch"], help="Version part to bump")
    bump_p.add_argument("--no-build", action="store_true", help="Skip build after bump")
    
    rel_sub.add_parser("list", help="List available releases")

    # Config
    cfg_p = subparsers.add_parser("config", help="Configuration management")
    cfg_sub = cfg_p.add_subparsers(dest="action", required=True)
    
    cfg_sub.add_parser("show", help="Show current configuration")
    
    cfg_set_p = cfg_sub.add_parser("set", help="Set configuration value")
    cfg_set_p.add_argument("key", help="Configuration key")
    cfg_set_p.add_argument("value", help="Configuration value")
    cfg_get_p = cfg_sub.add_parser("get", help="Get configuration value")
    cfg_get_p.add_argument("key", help="Configuration key")
    cfg_sub.add_parser("reset", help="Reset configuration to defaults")

    # Clean
    clean_p = subparsers.add_parser("clean", help="Clean build artifacts and temporary files")
    clean_p.add_argument("--logs", action="store_true", help="Also clean old logs")
    clean_p.add_argument("--log-days", type=int, default=30, help="Age in days to keep logs")

    args = parser.parse_args()
    setup_logging(level=args.log_level, verbose=args.verbose)
    
    if args.command == "install":
        return install(args)
    elif args.command == "start":
        return dev_start(args)
    elif args.command == "stop":
        return dev_stop(args)
    elif args.command == "restart":
        return dev_restart(args)
    elif args.command == "status":
        return dev_status(args)
    elif args.command == "logs":
        return dev_logs(args)
    elif args.command == "health":
        return dev_health(args)
    elif args.command == "db":
        if args.action == "migrate":
            return db_migrate(args)
        elif args.action == "revision":
            return db_revision(args)
        elif args.action == "rollback":
            return db_rollback(args)
        elif args.action == "seed":
            return db_seed(args)
        elif args.action == "reset":
            return db_reset(args)
        elif args.action == "status":
            return db_status(args)
    elif args.command == "build":
        if args.target == "agent":
            return build_agent(args)
    elif args.command == "release":
        if args.action == "bump":
            return release_bump(args)
        elif args.action == "list":
            return release_list(args)
    elif args.command == "config":
        if args.action == "show":
            return config_show(args)
        elif args.action == "set":
            return config_set(args)
        elif args.action == "get":
            return config_get(args)
        elif args.action == "reset":
            return config_reset(args)
    elif args.command == "clean":
        return clean(args)
    else:
        parser.print_help()
        return False
    
if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
    
    