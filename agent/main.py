import time
import requests
import os
import io
import sys
import re
import logging
import platform
import socket
import signal
import base64
import subprocess
from typing import Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from logging.handlers import RotatingFileHandler

from typer import Typer, Prompt, Option
from dotenv import load_dotenv, set_key

# Modern CLI Tools
from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
import psutil

# --- Path Resolution ---
BASE_DIR = Path(__file__).resolve().parent
HOME_CONFIG_DIR = Path.home() / ".synqx-agent"
ENV_FILE = HOME_CONFIG_DIR / ".env"
if not ENV_FILE.exists():
    ENV_FILE = BASE_DIR / ".env"

# Ensure config dir exists early
HOME_CONFIG_DIR.mkdir(parents=True, exist_ok=True)

PID_FILE = HOME_CONFIG_DIR / ".agent.pid"
LOG_FILE = HOME_CONFIG_DIR / "agent.log"

# --- Logging Configuration ---
# Set up logging before imports that might log
console = Console()
logger = logging.getLogger("SynqX-Agent")

def setup_logging(level="INFO"):
    file_handler = RotatingFileHandler(LOG_FILE, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True, show_path=False), file_handler]
    )

setup_logging()

# --- Engine Imports ---
sys.path.append(str(BASE_DIR))
try:
    from synqx_engine.dag import DAG
    from engine.executor import NodeExecutor, ParallelAgent
    from synqx_core.utils.serialization import sanitize_for_json
    from engine.core.sql_generator import StaticOptimizer
except ImportError as e:
    logger.error(f"CRITICAL: Engine core missing or dependencies not satisfied: {e}")
    # We don't exit here to allow 'configure' and 'version' commands to work
    DAG = None
    NodeExecutor = None
    ParallelAgent = None
    StaticOptimizer = None

# Load Environment
load_dotenv(ENV_FILE)

# Initialize Typer
app = Typer(help="SynqX Intelligent Remote Agent CLI", add_completion=False, rich_markup_mode="rich")

class SynqxAgent:
    def __init__(self, headless: bool = False):
        self.api_url = os.getenv("SYNQX_API_URL", "http://localhost:8000/api/v1")
        self.client_id = os.getenv("SYNQX_CLIENT_ID")
        self.api_key = os.getenv("SYNQX_API_KEY")
        self.tags = os.getenv("SYNQX_TAGS", "default").split(",")
        self.max_workers = int(os.getenv("SYNQX_MAX_WORKERS", "0"))
        self.headless = headless

        if not self.client_id or not self.api_key:
            if not self.headless:
                console.print(Panel("[bold red]Configuration Missing[/bold red]\nRun [cyan]python install.py[/cyan] or [cyan]configure[/cyan] command.", border_style="red"))
            sys.exit(1)

        self.hostname = socket.gethostname()
        try:
            self.ip_address = socket.gethostbyname(self.hostname)
        except socket.gaierror:
            self.ip_address = "127.0.0.1"

        self.last_heartbeat = 0
        self.session = requests.Session()
        self.session.headers.update({
            "X-SynqX-Client-ID": self.client_id,
            "X-SynqX-API-Key": self.api_key,
            "Content-Type": "application/json"
        })
        
        self.running = True
        self._telemetry_cache = {}
        
        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)

    def _handle_exit(self, signum, frame):
        logger.info("[STOP] Signal received. Shutting down...")
        self.running = False
        try:
            payload = {
                "status": "offline", 
                "system_info": {"os": platform.system(), "reason": "signal_received"},
                "ip_address": self.ip_address, 
                "version": "1.0.0"
            }
            self.session.post(f"{self.api_url}/agents/heartbeat", json=payload, timeout=2)
        except Exception:
            pass
        
        if PID_FILE.exists():
            try:
                PID_FILE.unlink()
            except Exception:
                pass
        sys.exit(0)

    def heartbeat(self):
        try:
            cpu = psutil.cpu_percent()
            mem = psutil.virtual_memory().percent
            payload = {
                "status": "online",
                "system_info": {
                    "os": platform.system(), 
                    "python": sys.version.split()[0], 
                    "cpu_usage": cpu, 
                    "memory_usage": mem,
                    "arch": platform.machine()
                },
                "ip_address": self.ip_address, 
                "version": "1.0.0",
                "hostname": self.hostname
            }
            resp = self.session.post(f"{self.api_url}/agents/heartbeat", json=payload, timeout=5)
            resp.raise_for_status()
        except Exception as e:
            logger.debug(f"Heartbeat failed: {e}")

    def report_job_status(self, job_id: int, status: str, message: str = "", duration: int = 0, records: int = 0):
        payload = {
            "status": status, 
            "message": message, 
            "execution_time_ms": duration, 
            "total_records": records,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        try:
            self.session.post(f"{self.api_url}/agents/jobs/{job_id}/status", json=payload, timeout=5)
        except Exception as e:
            logger.error(f"Failed to report job status for #{job_id}: {e}")

    def report_step_status(self, job_id: int, node_id: str, status: str, data: Dict[str, Any] = None):
        now = time.time()
        is_terminal = status.lower() in ["success", "failed"]
        last_report = self._telemetry_cache.get(node_id, 0)
        
        # Throttling non-terminal status updates
        if not is_terminal and (now - last_report < 2):
            return
            
        data = data or {}
        payload = {
            "node_id": node_id, 
            "status": status,
            "records_in": data.get("records_in", 0), 
            "records_out": data.get("records_out", 0),
            "records_filtered": data.get("records_filtered", 0), 
            "records_error": data.get("records_error", 0),
            "bytes_processed": data.get("bytes_processed", 0), 
            "quality_profile": data.get("quality_profile"),
            "error_message": data.get("error_message"), 
            "sample_data": data.get("sample_data")
        }
        
        try:
            proc = psutil.Process(os.getpid())
            payload["cpu_percent"] = proc.cpu_percent()
            payload["memory_mb"] = proc.memory_info().rss / (1024 * 1024)
        except Exception:
            pass
            
        try: 
            resp = self.session.post(f"{self.api_url}/agents/jobs/{job_id}/steps", json=payload, timeout=2)
            if resp.status_code == 200:
                self._telemetry_cache[node_id] = now
        except Exception:
            pass

    def send_logs(self, job_id: int, level: str, message: str, node_id: str = None):
        payload = [{
            "level": level, 
            "message": message, 
            "timestamp": datetime.now(timezone.utc).isoformat(), 
            "node_id": node_id
        }]
        try:
            self.session.post(f"{self.api_url}/agents/jobs/{job_id}/logs", json=payload, timeout=5)
        except Exception:
            pass

    def process_job(self, payload: Dict[str, Any]):
        if not all([DAG, NodeExecutor, ParallelAgent, StaticOptimizer]):
            logger.error("Cannot process job: Engine components missing.")
            return

        job_info = payload["job"]
        job_id = job_info["id"]
        dag_data = payload["dag"]
        connections = payload.get("connections", {})
        
        logger.info(f"[START] Initializing Pipeline Job #{job_id}")
        self.report_job_status(job_id, "running", "Orchestrating parallel execution plan")
        start_time = time.time()
        
        try:
            StaticOptimizer.optimize(dag_data['nodes'], dag_data['edges'], connections)
            dag = DAG()
            node_map = {n['node_id']: n for n in dag_data['nodes']}
            for n in dag_data['nodes']:
                dag.add_node(n['node_id'])
            for e in dag_data['edges']:
                dag.add_edge(e['from_node_id'], e['to_node_id'])
            
            executor = NodeExecutor(connections=connections)
            runner = ParallelAgent(executor=executor, max_workers=self.max_workers)
            
            def log_cb(msg, node_id=None):
                self.send_logs(job_id, "INFO", msg, node_id)
                
            def status_cb(node_id, status, data=None):
                self.report_step_status(job_id, node_id, status, data)
                
            run_stats = runner.run(dag, node_map, log_cb, status_cb)
            
            duration_ms = int((time.time() - start_time) * 1000)
            self.report_job_status(job_id, "success", f"Finalized in {duration_ms}ms", duration_ms, run_stats['total_records'])
            logger.info(f"[SUCCESS] Pipeline Job #{job_id} complete.")
        except Exception as e:
            logger.exception(f"[FAILED] Pipeline Job #{job_id} ABORTED")
            duration_ms = int((time.time() - start_time) * 1000)
            self.report_job_status(job_id, "failed", str(e), duration_ms)

    def validate_path(self, path: str) -> Path:
        """Securely validate that path is within the sandbox."""
        sandbox = HOME_CONFIG_DIR / "sandbox"
        sandbox.mkdir(exist_ok=True)
        
        target = (sandbox / path).resolve()
        if not str(target).startswith(str(sandbox.resolve())):
            raise ValueError(f"Security Violation: Access denied to {path}")
        return target

    def process_ephemeral_job(self, data: Dict[str, Any]):
        job_id = data["id"]
        job_type = data["type"]
        payload = data["payload"]
        conn_data = data.get("connection")
        
        logger.info(f"[INFO] Processing Ephemeral {job_type.upper()} Request #{job_id}")
        start_time = time.time()
        try:
            if not conn_data:
                raise ValueError("Connection metadata missing")
            
            from synqx_engine.connectors.factory import ConnectorFactory
            connector = ConnectorFactory.get_connector(conn_data["type"], conn_data["config"])
            result_update = {"status": "success"}
            
            if job_type == "explorer":
                query = payload.get("query")
                limit = int(payload.get("limit", 100))
                offset = int(payload.get("offset", 0))
                try:
                    results = connector.execute_query(query=query, limit=limit, offset=offset)
                except (NotImplementedError, AttributeError):
                    results = connector.fetch_sample(asset=query, limit=limit, offset=offset)
                
                if results:
                    try:
                        import polars as pl
                        df = pl.from_dicts(results)
                        buffer = io.BytesIO()
                        df.write_ipc(buffer)
                        result_update["result_sample_arrow"] = base64.b64encode(buffer.getvalue()).decode('utf-8')
                    except Exception:
                        result_update["result_sample"] = {"rows": results[:1000]}
                result_update["result_summary"] = {"count": len(results)}

            elif job_type == "metadata":
                task = payload.get("task_type")
                if task == "discover_assets":
                    result_update["result_sample"] = {"assets": connector.discover_assets(pattern=payload.get("pattern"))}
                else:
                    asset = payload.get("asset")
                    if asset:
                        result_update["result_sample"] = {"schema": connector.infer_schema(asset)}

            elif job_type == "test":
                with connector.session() as sess:
                    sess.test_connection()
                result_update["result_summary"] = {"message": "Verification Successful"}

            elif job_type == "file":
                action = payload.get("action")
                # SECURITY: Enforce sandbox
                path = str(self.validate_path(payload.get("path", "")))
                
                if action == "list":
                    # For listing, we might want to list relative to root, but here we list the sandboxed path
                    # Connector logic might expect a full path or relative. 
                    # Assuming connector.list_files handles local paths standardly.
                    result_update["result_sample"] = {"files": connector.list_files(path=path)}
                elif action == "mkdir":
                    connector.create_directory(path=path)
                elif action == "read":
                    content = connector.download_file(path=path)
                    result_update["result_sample"] = {"content": base64.b64encode(content).decode('utf-8')}
                elif action == "write":
                    connector.upload_file(path=path, content=base64.b64decode(payload.get("content")))
                elif action == "delete":
                    connector.delete_file(path=path)

            elif job_type == "system":
                # SYSTEM jobs are restricted to internal environment management only
                action = payload.get("action")
                lang = payload.get("language")
                pkg = payload.get("package")
                
                # Sandbox environments to .synqx-agent/envs
                base = HOME_CONFIG_DIR / "envs" / str(conn_data["id"]) / lang
                base.mkdir(parents=True, exist_ok=True)
                
                if action == "initialize":
                    if lang == "python":
                        subprocess.check_call([sys.executable, "-m", "venv", str(base / "venv")])
                elif action == "install":
                    # Sanitize package name to prevent chaining
                    if not re.match(r"^[a-zA-Z0-9_\-==.<>]+$", pkg):
                        raise ValueError(f"Invalid package name: {pkg}")
                        
                    bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
                    pip = base / "venv" / bin_dir / "pip"
                    out = subprocess.check_output([str(pip), "install", pkg], text=True)
                    result_update["result_summary"] = {"output": out}

            result_update["execution_time_ms"] = int((time.time() - start_time) * 1000)
            self.session.post(f"{self.api_url}/agents/jobs/ephemeral/{job_id}/status", json=sanitize_for_json(result_update), timeout=10)
            logger.info(f"[SUCCESS] Ephemeral Request #{job_id} complete.")
        except Exception as e:
            logger.exception(f"[FAILED] Ephemeral Request #{job_id} FAILED")
            try:
                self.session.post(f"{self.api_url}/agents/jobs/ephemeral/{job_id}/status", json={"status": "failed", "error_message": str(e)}, timeout=10)
            except Exception:
                pass

    def run(self):
        try:
            PID_FILE.write_text(str(os.getpid()))
        except Exception as e:
            logger.error(f"Could not write PID file: {e}")

        logger.info(f"[ONLINE] SynqX Agent Online. ID: {self.client_id}")
        self.heartbeat()
        self.last_heartbeat = time.time()
        
        consecutive_errors = 0
        while self.running:
            try:
                # Heartbeat every 30s
                if time.time() - self.last_heartbeat > 30:
                    self.heartbeat()
                    self.last_heartbeat = time.time()
                
                # Poll for jobs
                resp = self.session.post(f"{self.api_url}/agents/poll", json=self.tags, timeout=15)
                
                if resp.status_code == 200:
                    consecutive_errors = 0
                    data = resp.json()
                    if data.get("job"):
                        self.process_job(data)
                    elif data.get("ephemeral"):
                        self.process_ephemeral_job(data["ephemeral"])
                elif resp.status_code == 401:
                    logger.error("Authentication failed. Please check your credentials.")
                    self.running = False
                elif resp.status_code >= 500:
                    logger.warning(f"Server error ({resp.status_code}). Retrying...")
                    time.sleep(min(30, 5 * (consecutive_errors + 1)))
                    consecutive_errors += 1
                
                # Small delay to prevent tight loops on empty poll results
                time.sleep(2)
                
            except requests.exceptions.RequestException as e:
                consecutive_errors += 1
                logger.debug(f"Network error during poll: {e}")
                time.sleep(min(30, 2 * consecutive_errors))
            except Exception as e:
                logger.exception(f"Unexpected error in agent loop: {e}")
                time.sleep(5)

# --- CLI Commands ---

@app.command()
def start(
    daemon: bool = Option(False, "--daemon", "-d", help="Run in background"),
    log_level: str = Option("INFO", help="Logging level")
):
    """Start the SynqX Agent."""
    setup_logging(log_level)
    
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                console.print(f"[red]Error:[/red] Agent already running at PID {pid}")
                return
            else:
                logger.info("Removing stale PID file.")
                PID_FILE.unlink()
        except Exception:
            PID_FILE.unlink(missing_ok=True)

    if daemon and platform.system() != "Windows":
        # Simple daemonization for Unix-like systems
        try:
            pid = os.fork()
            if pid > 0:
                console.print(f"[green]Agent started in background (PID: {pid})[/green]")
                sys.exit(0)
        except OSError:
            console.print("[red]Fork failed:[/red]")
            sys.exit(1)
        
        os.setsid()
        # Second fork to prevent acquiring terminal
        try:
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError:
            sys.exit(1)
            
        # Redirect standard streams to devnull for daemon
        sys.stdout.flush()
        sys.stderr.flush()
        with open(os.devnull, 'rb') as f:
            os.dup2(f.fileno(), sys.stdin.fileno())
        with open(LOG_FILE, 'ab') as f:
            os.dup2(f.fileno(), sys.stdout.fileno())
            os.dup2(f.fileno(), sys.stderr.fileno())

    console.print(Panel.fit(
        f"[bold blue]SynqX Agent[/bold blue] v1.0.0\n"
        f"ID: [green]{os.getenv('SYNQX_CLIENT_ID')}[/green]\n"
        f"API: [cyan]{os.getenv('SYNQX_API_URL')}[/cyan]", 
        title="Lifecycle", 
        border_style="blue"
    ))
    
    agent = SynqxAgent(headless=daemon)
    agent.run()

@app.command()
def configure():
    """Interactive credential setup."""
    console.print("[bold]Agent Configuration[/bold]")
    api_url = Prompt.ask("API URL", default=os.getenv("SYNQX_API_URL", "http://localhost:8000/api/v1"))
    client_id = Prompt.ask("Client ID", default=os.getenv("SYNQX_CLIENT_ID", ""))
    api_key = Prompt.ask("API Key", password=True)
    
    set_key(str(ENV_FILE), "SYNQX_API_URL", api_url)
    set_key(str(ENV_FILE), "SYNQX_CLIENT_ID", client_id)
    set_key(str(ENV_FILE), "SYNQX_API_KEY", api_key)
    console.print("[bold green]✓[/bold green] Configuration saved.")

@app.command()
def ping():
    """Test connectivity to the SynqX API."""
    load_dotenv(ENV_FILE)
    api_url = os.getenv("SYNQX_API_URL")
    client_id = os.getenv("SYNQX_CLIENT_ID")
    api_key = os.getenv("SYNQX_API_KEY")
    
    headers = {
        "X-SynqX-Client-ID": client_id, 
        "X-SynqX-API-Key": api_key
    }
    
    with console.status("[cyan]Pinging gateway...[/cyan]"):
        try:
            resp = requests.post(f"{api_url}/agents/poll", json=[], headers=headers, timeout=5)
            if resp.status_code in [200, 422]:
                console.print("[bold green]✓[/bold green] Connected to SynqX Cloud")
            elif resp.status_code == 401:
                console.print("[bold red]✗[/bold red] Authentication Failed (401)")
            else:
                console.print(f"[bold red]✗[/bold red] HTTP {resp.status_code}")
        except Exception as e:
            console.print(f"[bold red]✗[/bold red] Connection Error: {e}")

@app.command()
def status():
    """Check the status of the local agent process."""
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                proc = psutil.Process(pid)
                uptime = datetime.fromtimestamp(proc.create_time()).strftime("%Y-%m-%d %H:%M:%S")
                console.print(f"[bold green]RUNNING[/bold green] (PID: {pid})")
                console.print(f"Uptime: {uptime}")
                console.print(f"Memory: {proc.memory_info().rss / 1024 / 1024:.1f} MB")
                console.print(f"CPU: {proc.cpu_percent(interval=0.1)}%")
            else:
                console.print("[bold yellow]STALE[/bold yellow] (Process not found but PID file exists)")
        except Exception as e:
            console.print(f"[bold red]ERROR[/bold red] checking status: {e}")
    else:
        console.print("[bold yellow]STOPPED[/bold yellow]")

@app.command()
def stop():
    """Stop the running agent process."""
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                console.print(f"Stopping agent (PID: {pid})...")
                os.kill(pid, signal.SIGTERM)
                # Wait for cleanup
                for _ in range(5):
                    if not psutil.pid_exists(pid):
                        console.print("[bold green]✓[/bold green] Agent stopped.")
                        return
                    time.sleep(1)
                os.kill(pid, signal.SIGKILL)
                console.print("[bold yellow]![/bold yellow] Agent force-killed.")
            else:
                console.print("Agent is not running.")
                PID_FILE.unlink(missing_ok=True)
        except Exception as e:
            console.print(f"[bold red]Error stopping agent:[/bold red] {e}")
    else:
        console.print("No PID file found. Agent is likely not running.")

@app.command()
def version():
    """Display the Agent version."""
    console.print("SynqX Agent [bold blue]v1.0.0[/bold blue]")

if __name__ == "__main__":
    app()