import time
import requests
import os
import io
import sys
import logging
import platform
import socket
import signal
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler

import typer
from dotenv import load_dotenv, set_key

# Modern CLI Tools
from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.progress import Progress, SpinnerColumn, TextColumn

# Platform agnostic path resolution
BASE_DIR = Path(__file__).resolve().parent
# Prioritize user-home config for installed agent
USER_CONFIG_DIR = Path.home() / ".synqx-agent"
ENV_FILE = USER_CONFIG_DIR / ".env"
if not ENV_FILE.exists():
    # Fallback to local (dev mode)
    ENV_FILE = BASE_DIR / ".env"

PID_FILE = BASE_DIR / ".agent.pid" 
# If we can't write to BASE_DIR (e.g. installed in site-packages), use user home
if not os.access(BASE_DIR, os.W_OK):
    PID_FILE = USER_CONFIG_DIR / ".agent.pid"
    LOG_FILE = USER_CONFIG_DIR / "agent.log"
else:
    LOG_FILE = BASE_DIR / "agent.log"

# Ensure config dir exists if we are going to write to it
if not USER_CONFIG_DIR.exists() and (PID_FILE.parent == USER_CONFIG_DIR or LOG_FILE.parent == USER_CONFIG_DIR):
    USER_CONFIG_DIR.mkdir(exist_ok=True)

# Import local engine logic
sys.path.append(str(BASE_DIR))
try:
    from synqx_engine.dag import DAG  # noqa: E402
    from engine.executor import NodeExecutor, ParallelAgent  # noqa: E402
    from synqx_core.utils.serialization import sanitize_for_json  # noqa: E402
    from engine.core.sql_generator import StaticOptimizer  # noqa: E402
except ImportError as e:
    print(f"CRITICAL ERROR: Failed to import internal modules: {e}")
    print("Ensure you are running from the correct environment or have installed the package.")
    sys.exit(1)

# Load existing .env
load_dotenv(ENV_FILE)

# Initialize Typer and Rich
app = typer.Typer(help="SynqX Intelligent Remote Agent CLI", add_completion=False)
console = Console()

# Configure Logging with Rotation
file_handler = RotatingFileHandler(
    LOG_FILE, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[
        RichHandler(console=console, rich_tracebacks=True, show_path=False),
        file_handler
    ]
)
logger = logging.getLogger("SynqX-Agent")

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
                console.print("[bold red][CRITICAL] Error:[/bold red] Agent not configured.")
                console.print("Run [bold cyan]synqx-agent configure[/bold cyan] to set up credentials.")
            if self.headless:
                sys.exit(1)

        self.hostname = socket.gethostname()
        self.ip_address = socket.gethostbyname(self.hostname)
        self.last_heartbeat = 0
        self.headers = {
            "X-SynqX-Client-ID": self.client_id,
            "X-SynqX-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        self.running = True
        self._telemetry_cache = {} # node_id -> last_report_time
        
        # Register signals
        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)

    def _handle_exit(self, signum, frame):
        logger.info(f"[STOP] Signal {signum} received. Initiating graceful shutdown...")
        self.running = False
        try:
            payload = {
                "status": "offline",
                "system_info": {"os": platform.system()},
                "ip_address": self.ip_address,
                "version": "1.0.0"
            }
            requests.post(f"{self.api_url}/agents/heartbeat", json=payload, headers=self.headers, timeout=2)
        except Exception:
            pass
        
        if PID_FILE.exists():
            PID_FILE.unlink()
        
        logger.info("Agent stopped.")
        sys.exit(0)

    def heartbeat(self):
        try:
            # Gather real-time metrics
            cpu_usage = 0.0
            memory_usage = 0.0
            try:
                import psutil
                cpu_usage = psutil.cpu_percent()
                memory_usage = psutil.virtual_memory().percent
            except ImportError:
                pass

            payload = {
                "status": "online",
                "system_info": {
                    "os": platform.system(), 
                    "python": sys.version.split()[0],
                    "cpu_usage": cpu_usage,
                    "memory_usage": memory_usage
                },
                "ip_address": self.ip_address,
                "version": "1.0.0"
            }
            requests.post(f"{self.api_url}/agents/heartbeat", json=payload, headers=self.headers, timeout=5)
            logger.debug(f"Heartbeat sent. CPU: {cpu_usage}%, MEM: {memory_usage}%")
        except Exception as e:
            logger.error(f"Heartbeat failed: {e}")

    def process_job(self, payload: Dict[str, Any]):
        job_info = payload["job"]
        job_id = job_info["id"]
        dag_data = payload["dag"]
        connections = payload.get("connections", {})
        
        logger.info(f"[START] Initializing Pipeline Job #{job_id}")
        self.report_job_status(job_id, "running", "Orchestrating high-fidelity parallel execution plan")
        
        start_time = time.time()
        
        try:
            # 0. PERFORMANCE: Apply Static Optimizations (ELT Pushdown)
            logger.info(f"[INFO] Analyzing pipeline topology for Job #{job_id}...")
            StaticOptimizer.optimize(dag_data['nodes'], dag_data['edges'], connections)

            # 1. Reconstruct High-Fidelity DAG
            dag = DAG()
            node_map = {n['node_id']: n for n in dag_data['nodes']}
            for n in dag_data['nodes']:
                dag.add_node(n['node_id'])
            for e in dag_data['edges']:
                dag.add_edge(e['from_node_id'], e['to_node_id'])
            
            # 2. Parallel Execution Lifecycle
            executor = NodeExecutor(connections=connections)
            runner = ParallelAgent(executor=executor, max_workers=self.max_workers)
            
            def log_callback(msg, node_id=None):
                self.send_logs(job_id, "INFO", msg, node_id)
            
            def status_callback(node_id, status, data=None):
                self.report_step_status(job_id, node_id, status, data)

            # Execution
            run_stats = runner.run(dag, node_map, log_callback, status_callback)

            # 3. Success Report
            duration_ms = int((time.time() - start_time) * 1000)
            self.report_job_status(
                job_id, 
                "success", 
                f"Execution finalized in {duration_ms}ms", 
                duration_ms, 
                run_stats['total_records']
            )
            logger.info(f"[SUCCESS] Pipeline Job #{job_id} finalized successfully in {duration_ms}ms")

        except Exception as e:
            logger.exception(f"[FAILED] Pipeline Job #{job_id} ABORTED")
            duration_ms = int((time.time() - start_time) * 1000)
            self.report_job_status(job_id, "failed", f"Terminal execution fault: {str(e)}", duration_ms)

    def process_ephemeral_job(self, data: Dict[str, Any]):
        job_id = data["id"]
        job_type = data["type"]
        payload = data["payload"]
        conn_data = data.get("connection")
        
        logger.info(f"[INFO] Processing Ephemeral {job_type.upper()} Request #{job_id}")
        start_time = time.time()
        
        try:
            if not conn_data:
                raise ValueError("Contextual connection metadata missing for ephemeral request")
            
            from synqx_engine.connectors.factory import ConnectorFactory
            connector = ConnectorFactory.get_connector(conn_data["type"], conn_data["config"])
            
            result_update = {"status": "success"}
            
            if job_type == "explorer":
                query = payload.get("query")
                limit = int(payload.get("limit", 100))
                offset = int(payload.get("offset", 0))
                params = payload.get("params") or {}
                
                results = []
                total_count = 0
                
                try:
                    # Prefer dedicated execute_query path
                    results = connector.execute_query(query=query, limit=limit, offset=offset, **params)
                    total_count = connector.get_total_count(query, is_query=True, **params)
                except NotImplementedError:
                    # Fallback to fetch_sample (Matches Backend)
                    results = connector.fetch_sample(asset=query, limit=limit, offset=offset, **params)
                    total_count = connector.get_total_count(query, is_query=False, **params)
                
                columns = list(results[0].keys()) if results else []
                result_update["result_summary"] = {
                    "count": len(results), 
                    "total_count": total_count or len(results),
                    "columns": columns
                }
                
                # PERFORMANCE: Use Arrow for efficient data transfer
                if results:
                    try:
                        import polars as pl
                        import base64
                        
                        # Convert to Polars and then to Arrow IPC bytes
                        df = pl.from_dicts(results)
                        buffer = io.BytesIO()
                        df.write_ipc(buffer)
                        
                        # Encode as Base64 for JSON transport
                        result_update["result_sample_arrow"] = base64.b64encode(buffer.getvalue()).decode('utf-8')
                        logger.debug(f"Serialized {len(results)} rows to Arrow ({buffer.tell()} bytes)")
                    except Exception as e:
                        logger.warning(f"Arrow serialization failed, falling back to JSON: {e}")
                        # Fallback to JSON truncation for backend transmission
                        if len(results) > 1000:
                            result_update["result_sample"] = {"rows": results[:1000], "is_truncated": True}
                        else:
                            result_update["result_sample"] = {"rows": results}
                else:
                    result_update["result_sample"] = {"rows": []}
            
            elif job_type == "metadata":
                task_type = payload.get("task_type")
                if task_type == "discover_assets" or "discover_assets" in str(payload.get("task_name", "")):
                    discovered = connector.discover_assets(
                        pattern=payload.get("pattern"),
                        include_metadata=payload.get("include_metadata", False)
                    )
                    result_update["result_sample"] = {"assets": discovered}
                else:
                    # Default to schema inference if asset name provided
                    asset = payload.get("asset")
                    if asset:
                        sample_size = int(payload.get("limit", 1000))
                        schema = connector.infer_schema(asset, sample_size=sample_size)
                        
                        # Fetch sample rows for dtypes verification/parity
                        try:
                            results = connector.fetch_sample(asset=asset, limit=10)
                            if results:
                                import polars as pl
                                import base64
                                df = pl.from_dicts(results)
                                buffer = io.BytesIO()
                                df.write_ipc(buffer)
                                result_update["result_sample_arrow"] = base64.b64encode(buffer.getvalue()).decode('utf-8')
                        except Exception as e:
                            logger.debug(f"Metadata sample serialization failed: {e}")
                        
                        result_update["result_sample"] = {
                            "schema": schema
                        }
            
            elif job_type == "test":
                with connector.session() as sess:
                    sess.test_connection()
                result_update["result_summary"] = {"message": "Verification Successful"}

            elif job_type == "system":
                # Dependency / Environment Management
                action = payload.get("action")
                language = payload.get("language")
                package = payload.get("package")
                
                import subprocess
                base_dir = os.path.join(os.getcwd(), ".synqx", "envs", str(conn_data["id"]), language)
                os.makedirs(base_dir, exist_ok=True)
                
                if action == "initialize":
                    if language == "python":
                        subprocess.check_call([sys.executable, "-m", "venv", os.path.join(base_dir, "venv")])
                        result_update["result_summary"] = {"status": "ready", "version": "Isolated Runtime"}
                    elif language == "node":
                        subprocess.check_call(["npm", "init", "-y"], cwd=base_dir)
                        result_update["result_summary"] = {"status": "ready", "version": "Isolated Runtime"}
                
                elif action == "install":
                    if language == "python":
                        pip = os.path.join(base_dir, "venv", "bin", "pip")
                        if platform.system() == "Windows":
                            pip = os.path.join(base_dir, "venv", "Scripts", "pip.exe")
                        out = subprocess.check_output([pip, "install", package], text=True)
                        result_update["result_summary"] = {"output": out}
                    elif language == "node":
                        out = subprocess.check_output(["npm", "install", package], cwd=base_dir, text=True)
                        result_update["result_summary"] = {"output": out}

            elif job_type == "file":
                action = payload.get("action")
                path = payload.get("path", "")
                
                if action == "list":
                    files = connector.list_files(path=path)
                    result_update["result_sample"] = {"files": files}
                elif action == "mkdir":
                    connector.create_directory(path=path)
                    result_update["result_summary"] = {"status": "created"}
                elif action == "read":
                    # 10MB Limit for Ephemeral Transfer
                    MAX_SIZE = 10 * 1024 * 1024 
                    content = connector.download_file(path=path)
                    if len(content) > MAX_SIZE:
                        raise ValueError(f"Payload exceeds safety limit (10MB). Current size: {len(content)/1024/1024:.2f}MB")
                    b64_content = base64.b64encode(content).decode('utf-8')
                    result_update["result_sample"] = {"content": b64_content}
                elif action == "zip":
                    MAX_SIZE = 10 * 1024 * 1024
                    content = connector.zip_directory(path=path)
                    if len(content) > MAX_SIZE:
                        raise ValueError(f"Archive exceeds safety limit (10MB). Current size: {len(content)/1024/1024:.2f}MB")
                    b64_content = base64.b64encode(content).decode('utf-8')
                    result_update["result_sample"] = {"content": b64_content}
                elif action == "write":
                    # Upload Binary File
                    content_b64 = payload.get("content")
                    if not content_b64:
                        raise ValueError("No binary payload provided for write operation")
                    content = base64.b64decode(content_b64)
                    connector.upload_file(path=path, content=content)
                    result_update["result_summary"] = {"status": "written", "size": len(content)}
                elif action == "save":
                    # Save Text File
                    content_str = payload.get("content", "")
                    content = content_str.encode("utf-8")
                    connector.upload_file(path=path, content=content)
                    result_update["result_summary"] = {"status": "committed", "size": len(content)}
                elif action == "delete":
                    connector.delete_file(path=path)
                    result_update["result_summary"] = {"status": "purged"}

            duration_ms = int((time.time() - start_time) * 1000)
            result_update["execution_time_ms"] = duration_ms
            
            # Sanitize payload to handle Timestamps and other non-JSON types
            safe_result = sanitize_for_json(result_update)
            
            requests.post(f"{self.api_url}/agents/jobs/ephemeral/{job_id}/status", json=safe_result, headers=self.headers, timeout=10)
            logger.info(f"[SUCCESS] Ephemeral Request #{job_id} finalized successfully.")

        except Exception as e:
            logger.exception(f"[FAILED] Ephemeral Request #{job_id} FAILED")
            duration_ms = int((time.time() - start_time) * 1000)
            requests.post(f"{self.api_url}/agents/jobs/ephemeral/{job_id}/status", json={"status": "failed", "error_message": f"Interactive task failure: {str(e)}", "execution_time_ms": duration_ms}, headers=self.headers, timeout=10)


    def report_job_status(self, job_id: int, status: str, message: str = "", duration: int = 0, records: int = 0):
        payload = {"status": status, "message": message, "execution_time_ms": duration, "total_records": records}
        try:
            requests.post(f"{self.api_url}/agents/jobs/{job_id}/status", json=payload, headers=self.headers, timeout=5)
        except Exception:
            pass

    def report_step_status(self, job_id: int, node_id: str, status: str, data: Dict[str, Any] = None):
        """
        Send granular step telemetry to the backend with intelligent throttling.
        """
        now = time.time()
        is_terminal = status.lower() in ["success", "failed"]
        last_report = self._telemetry_cache.get(node_id, 0)
        
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
            import psutil
            proc = psutil.Process(os.getpid())
            payload["cpu_percent"] = proc.cpu_percent()
            payload["memory_mb"] = proc.memory_info().rss / (1024 * 1024)
        except ImportError:
            pass

        try: 
            resp = requests.post(f"{self.api_url}/agents/jobs/{job_id}/steps", json=payload, headers=self.headers, timeout=2)
            if resp.status_code == 200:
                self._telemetry_cache[node_id] = now
        except Exception as e: 
            logger.debug(f"Failed to report step status: {e}")

    def send_logs(self, job_id: int, level: str, message: str, node_id: str = None):
        payload = [{"level": level, "message": message, "timestamp": datetime.utcnow().isoformat() + "Z", "node_id": node_id}]
        try:
            requests.post(f"{self.api_url}/agents/jobs/{job_id}/logs", json=payload, headers=self.headers, timeout=5)
        except Exception:
            pass

    def run(self):
        # Store PID
        with open(PID_FILE, "w") as f:
            f.write(str(os.getpid()))
            
        logger.info(f"[ONLINE] SynqX Agent Online. ID: {self.client_id} (PID: {os.getpid()})")
        logger.info(f"Targeting API: {self.api_url}")
        
        # Send initial heartbeat to register as online
        self.heartbeat()

        consecutive_errors = 0
        while self.running:
            try:
                if time.time() - self.last_heartbeat > 30:
                    self.heartbeat()
                    self.last_heartbeat = time.time()
                
                resp = requests.post(f"{self.api_url}/agents/poll", json=self.tags, headers=self.headers, timeout=10)
                
                if resp.status_code == 200:
                    consecutive_errors = 0
                    data = resp.json()
                    if data.get("job"):
                        self.process_job(data)
                    elif data.get("ephemeral"):
                        self.process_ephemeral_job(data["ephemeral"])
                elif resp.status_code >= 500:
                    logger.warning(f"Server error during poll (HTTP {resp.status_code}). Backing off.")
                    consecutive_errors += 1
                    time.sleep(min(30, 5 * consecutive_errors)) # Exponential backoff up to 30s
                
            except requests.exceptions.RequestException as e:
                consecutive_errors += 1
                if consecutive_errors % 10 == 0: # Log only occasionally on spam failure
                    logger.error(f"Connection failure: {e}")
                time.sleep(min(30, 5 * consecutive_errors))
            except Exception as e:
                logger.exception(f"Unexpected error in main loop: {e}")
                time.sleep(5)
                
            time.sleep(5)

# --- CLI COMMANDS ---

def _do_start(background: bool = False):
    """Core start logic."""
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, 0) # Check if process exists
            console.print(f"[bold red]Error:[/bold red] Agent is already running (PID {pid}).")
            console.print("Run 'synqx-agent stop' first.")
            raise typer.Exit(1)
        except (ProcessLookupError, ValueError):
            # Stale PID file
            console.print("[yellow]Found stale PID file. Removing.[/yellow]")
            PID_FILE.unlink()

    console.print(Panel.fit(
        f"[bold blue]SynqX Agent[/bold blue] v1.0.0\n"
        f"ID: [green]{os.getenv('SYNQX_CLIENT_ID')}[/green]\n"
        f"API: [cyan]{os.getenv('SYNQX_API_URL')}[/cyan]",
        title="Agent Startup",
        border_style="blue"
    ))
    
    agent = SynqxAgent(headless=False)
    try:
        agent.run()
    except KeyboardInterrupt:
        console.print("\n[bold yellow]Stopping agent...[/bold yellow]")
    except Exception as e:
        console.print(f"[bold red]Fatal Error:[/bold red] {e}")
        logger.exception("Fatal error")
    finally:
        if PID_FILE.exists():
            PID_FILE.unlink()

@app.command()
def start():
    """Start the SynqX Agent in the foreground."""
    _do_start()

@app.command()
def check():
    """Verify configuration and connectivity without starting."""
    console.print("[bold]Diagnostic Check[/bold]")
    
    # 1. Config
    if not ENV_FILE.exists():
        console.print("[red][ERROR] Configuration file not found (.env)[/red]")
        return
    
    load_dotenv(ENV_FILE)
    api_url = os.getenv("SYNQX_API_URL")
    client_id = os.getenv("SYNQX_CLIENT_ID")
    api_key = os.getenv("SYNQX_API_KEY")
    
    if not all([api_url, client_id, api_key]):
        console.print("[red][ERROR] Missing required configuration (URL, Client ID, or Key).[/red]")
        return
    
    console.print(f"[green][OK] Config loaded ({ENV_FILE})[/green]")
    
    # 2. Connectivity
    try:
        headers = {
            "X-SynqX-Client-ID": client_id,
            "X-SynqX-API-Key": api_key,
            "Content-Type": "application/json"
        }
        resp = requests.post(f"{api_url}/agents/poll", json=[], headers=headers, timeout=5)
        if resp.status_code in [200, 422]:
            console.print(f"[green][OK] Connected to SynqX Cloud ({resp.elapsed.total_seconds()*1000:.0f}ms)[/green]")
        elif resp.status_code == 401:
            console.print("[red][ERROR] Authentication Failed (Invalid ID or Key)[/red]")
        else:
            console.print(f"[red][ERROR] Server returned error: HTTP {resp.status_code}[/red]")
    except Exception as e:
        console.print(f"[red][ERROR] Connection failed: {e}[/red]")

@app.command()
def stop():
    """Stop the running agent."""
    if not PID_FILE.exists():
        console.print("[yellow]No active agent found (no PID file).[/yellow]")
        return

    try:
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        
        console.print(f"Stopping Agent (PID: {pid})...")
        os.kill(pid, signal.SIGTERM)
        
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as progress:
            progress.add_task(description="Waiting for shutdown...", total=None)
            for _ in range(50): # Wait up to 5s
                if not PID_FILE.exists():
                    break
                # Check if process still alive
                try:
                    os.kill(pid, 0) 
                except ProcessLookupError:
                    break # Process gone
                time.sleep(0.1)
        
        # Force Kill if still running
        if PID_FILE.exists():
             try:
                os.kill(pid, 0)
                console.print("[red]Graceful stop failed. Forcing kill...[/red]")
                os.kill(pid, signal.SIGKILL)
             except ProcessLookupError:
                 pass
             PID_FILE.unlink()
        
        console.print("[green]Agent stopped successfully.[/green]")

    except ProcessLookupError:
        console.print("[yellow]Process not found. Cleaning up stale PID file.[/yellow]")
        PID_FILE.unlink()
    except Exception as e:
        console.print(f"[red]Error stopping agent: {e}[/red]")

@app.command()
def restart():
    """Restart the agent."""
    stop()
    time.sleep(1)
    start()

@app.command()
def configure(
    api_url: str = typer.Option(None, prompt=True, help="SynqX API URL"),
    client_id: str = typer.Option(None, prompt=True, help="Agent Client ID"),
    api_key: str = typer.Option(None, prompt=True, hide_input=True, help="Agent API Key"),
    tags: str = typer.Option("default", prompt=True, help="Comma-separated tags")
):
    """Interactively configure the agent credentials."""
    if not ENV_FILE.exists():
        ENV_FILE.touch()
    set_key(str(ENV_FILE), "SYNQX_API_URL", api_url)
    set_key(str(ENV_FILE), "SYNQX_CLIENT_ID", client_id)
    set_key(str(ENV_FILE), "SYNQX_API_KEY", api_key)
    set_key(str(ENV_FILE), "SYNQX_TAGS", tags)
    console.print(f"\n[bold green][SUCCESS] Configuration saved to {ENV_FILE}[/bold green]")

@app.command()
def status():
    """Check agent configuration and status."""
    check()
    if PID_FILE.exists():
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            os.kill(pid, 0)
            console.print(f"[green]Agent is RUNNING (PID: {pid})[/green]")
        except Exception:
            console.print("[red]PID file exists but process is dead.[/red]")
    else:
        console.print("[yellow]Agent is STOPPED[/yellow]")

@app.command()
def version():
    """Show agent version."""
    console.print("[bold blue]SynqX Agent[/bold blue] v1.0.0")

def main_cli():
    app()

if __name__ == "__main__":
    main_cli()
