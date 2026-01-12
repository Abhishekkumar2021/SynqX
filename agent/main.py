import time
import requests
import os
import io
import sys
import logging
import platform
import socket
import signal
from typing import Dict, Any
from datetime import datetime
from pathlib import Path

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
ENV_FILE = BASE_DIR / ".env"
PID_FILE = BASE_DIR / ".agent.pid"

# Import local engine logic
sys.path.append(str(BASE_DIR))
from synqx_engine.dag import DAG  # noqa: E402
from engine.executor import NodeExecutor, ParallelAgent  # noqa: E402
from synqx_core.utils.serialization import sanitize_for_json  # noqa: E402
from engine.core.sql_generator import StaticOptimizer  # noqa: E402

# Load existing .env
load_dotenv(ENV_FILE)

# Initialize Typer and Rich
app = typer.Typer(help="SynqX Intelligent Remote Agent CLI", add_completion=False)
console = Console()

# Configure Logging with Rich
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[
        RichHandler(console=console, rich_tracebacks=True, show_path=False),
        logging.FileHandler("agent.log")
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
            # In interactive mode we don't want to exit immediately if possible, 
            # but for the Agent class itself, it needs config. 
            # We'll handle this in the calling code.
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
        logger.info("[STOP] Shutdown signal received. Cleaning up...")
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
        if not self.headless:
            console.print("[bold yellow]Agent stopped.[/bold yellow]")
        
        # Only exit system if we are not in interactive loop or if it's a hard signal
        # For now, we'll raise an exception to break the loop or exit
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
        Terminal states (success, failed) are always sent immediately.
        Progress updates are throttled to once every 2 seconds per node.
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
            "records_error": data.get("records_error", 0),
            "bytes_processed": data.get("bytes_processed", 0),
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
        while self.running:
            if time.time() - self.last_heartbeat > 30:
                self.heartbeat()
                self.last_heartbeat = time.time()
            try:
                resp = requests.post(f"{self.api_url}/agents/poll", json=self.tags, headers=self.headers, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("job"):
                        self.process_job(data)
                    elif data.get("ephemeral"):
                        self.process_ephemeral_job(data["ephemeral"])
            except Exception:
                pass
            time.sleep(5)

# --- CLI COMMANDS ---

def _do_start(interactive=False):
    """Core start logic."""
    if PID_FILE.exists():
        console.print("[bold yellow]Warning:[/bold yellow] Agent appears to be running (PID file exists).")
        if interactive:
            if not Confirm.ask("Do you want to start anyway (this might cause conflicts)?"):
                return
        else:
             console.print("[red]Aborted. Use interactive mode or delete .agent.pid manually.")
             raise typer.Exit(1)
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
        if PID_FILE.exists():
            PID_FILE.unlink()

@app.command()
def start():
    """Start the SynqX Agent in the foreground."""
    _do_start(interactive=False)

def _do_stop(interactive=False):
    if not PID_FILE.exists():
        console.print("[red][ERROR] No running agent found (no .agent.pid file).[/red]")
        if not interactive:
            raise typer.Exit(1)
        return

    try:
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        
        console.print(f"[STOP] Stopping Agent (PID: {pid})...")
        os.kill(pid, signal.SIGTERM)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
        ) as progress:
            progress.add_task(description="Waiting for shutdown...", total=None)
            for _ in range(50):
                if not PID_FILE.exists():
                    break
                time.sleep(0.1)
        
        if PID_FILE.exists():
            console.print("[bold red]Failed to graceful stop. Force killing...[/bold red]")
            os.kill(pid, signal.SIGKILL)
            PID_FILE.unlink()
        else:
            console.print("[bold green][SUCCESS] Agent stopped successfully.[/bold green]")

    except ProcessLookupError:
        console.print("[yellow][WARN] Process not found. Cleaning up PID file.[/yellow]")
        PID_FILE.unlink()
    except Exception as e:
        console.print(f"[bold red]Error stopping agent:[/bold red] {e}")

@app.command()
def stop():
    """Stop a running agent (by PID)."""
    _do_stop(interactive=False)

def _do_configure():
    if not ENV_FILE.exists():
        ENV_FILE.touch()
    
    api_url = Prompt.ask("SynqX API URL", default=os.getenv("SYNQX_API_URL", "http://localhost:8000/api/v1"))
    client_id = Prompt.ask("Agent Client ID", default=os.getenv("SYNQX_CLIENT_ID", ""))
    api_key = Prompt.ask("Agent API Key", password=True, default=os.getenv("SYNQX_API_KEY", ""))
    tags = Prompt.ask("Agent Tags", default=os.getenv("SYNQX_TAGS", "default"))

    set_key(str(ENV_FILE), "SYNQX_API_URL", api_url)
    set_key(str(ENV_FILE), "SYNQX_CLIENT_ID", client_id)
    set_key(str(ENV_FILE), "SYNQX_API_KEY", api_key)
    set_key(str(ENV_FILE), "SYNQX_TAGS", tags)
    
    console.print(f"\n[bold green][SUCCESS] Configuration saved to {ENV_FILE}[/bold green]")

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

def _do_status():
    table = Table(title="Agent Status Diagnostic")
    table.add_column("Component", style="cyan")
    table.add_column("Status", style="bold")
    table.add_column("Details")

    # Config Check
    if ENV_FILE.exists():
        table.add_row("Configuration", "[green]Found[/green]", str(ENV_FILE))
        client_id = os.getenv("SYNQX_CLIENT_ID")
        api_url = os.getenv("SYNQX_API_URL")
    else:
        table.add_row("Configuration", "[red]Missing[/red]", "Run 'configure'")
        console.print(table)
        return

    # Connection Check
    conn_status = "[bold yellow]Checking...[/bold yellow]"
    conn_detail = ""
    
    try:
        headers = {"X-SynqX-Client-ID": client_id, "X-SynqX-API-Key": os.getenv("SYNQX_API_KEY")}
        with console.status("Pinging SynqX Cloud..."):
            resp = requests.post(f"{api_url}/agents/poll", json=[], headers=headers, timeout=5)
        
        if resp.status_code in [200, 422]:
            conn_status = "[green]Connected[/green]"
            conn_detail = f"Latency: {resp.elapsed.total_seconds()*1000:.0f}ms"
        elif resp.status_code == 401:
            conn_status = "[red]Auth Failed[/red]"
            conn_detail = "Invalid API Key/ID"
        else:
            conn_status = "[red]Error[/red]"
            conn_detail = f"HTTP {resp.status_code}"
    except Exception as e:
        conn_status = "[red]Offline[/red]"
        conn_detail = str(e)[:50]

    table.add_row("Cloud API", conn_status, conn_detail)
    
    # Process Check
    if PID_FILE.exists():
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            os.kill(pid, 0) # Check if running
            table.add_row("Agent Process", "[green]Running[/green]", f"PID: {pid}")
        except Exception:
            table.add_row("Agent Process", "[red]Stale PID[/red]", "Process died unexpectedly")
    else:
        table.add_row("Agent Process", "[dim]Stopped[/dim]", "")

    console.print(table)

@app.command()
def status():
    """Check agent configuration and cloud connectivity."""
    _do_status()

@app.command()
def version():
    """Show agent version."""
    console.print("[bold blue]SynqX Agent[/bold blue] v1.0.0")

def interactive_loop():
    console.clear()
    console.print(Panel.fit(
        "[bold cyan]SynqX Agent Interactive Mode[/bold cyan]\n"
        "Control your agent instance from this menu.",
        border_style="cyan"
    ))
    
    while True:
        console.print()
        choice = Prompt.ask(
            "Select action", 
            choices=["start", "stop", "status", "configure", "version", "exit"],
            default="status"
        )
        
        if choice == "exit":
            console.print("[yellow]Exiting interactive mode.[/yellow]")
            break
        elif choice == "start":
            _do_start(interactive=True)
        elif choice == "stop":
            _do_stop(interactive=True)
        elif choice == "status":
            _do_status()
        elif choice == "configure":
            _do_configure()
        elif choice == "version":
            console.print("[bold blue]SynqX Agent[/bold blue] v1.0.0")

@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context, 
    interactive: bool = typer.Option(False, "--interactive", "-i", help="Launch interactive mode")
):
    if interactive:
        interactive_loop()
    elif ctx.invoked_subcommand is None:
        # If no command and no interactive flag, show help
        console.print(Panel("Run [bold]synqx-agent --help[/bold] for commands or use [bold]-i[/bold] for interactive mode.", title="SynqX Agent CLI"))

def main_cli():
    app()

if __name__ == "__main__":
    main_cli()
