import logging
import os
import signal
import sys
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

import psutil

from dotenv import load_dotenv, set_key

import platform # Import platform



from rich.console import Console

from rich.logging import RichHandler
from rich.panel import Panel
from typer import Option, Prompt, Typer

# --- Components ---
# We add current dir to path to find agent/components
sys.path.append(str(Path(__file__).resolve().parent))

from components.api_client import AgentAPIClient
from components.handlers.ephemeral_handler import EphemeralHandler
from components.handlers.pipeline_handler import PipelineHandler
from components.handlers.system_handler import SystemHandler

# --- Path Resolution ---
BASE_DIR = Path(__file__).resolve().parent
HOME_CONFIG_DIR = Path.home() / ".synqx-agent"
ENV_FILE = HOME_CONFIG_DIR / ".env"
if not ENV_FILE.exists():
    ENV_FILE = BASE_DIR / ".env"

HOME_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
PID_FILE = HOME_CONFIG_DIR / ".agent.pid"
LOG_FILE = HOME_CONFIG_DIR / "agent.log"

# --- Logging Configuration ---
console = Console()
logger = logging.getLogger("SynqX-Agent")


def setup_logging(level="INFO"):
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )

    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[
            RichHandler(console=console, rich_tracebacks=True, show_path=False),
            file_handler,
        ],
    )


setup_logging()
load_dotenv(ENV_FILE)

app = Typer(
    help="SynqX Intelligent Remote Agent CLI",
    add_completion=False,
    rich_markup_mode="rich",
)


class AgentRuntime:
    def __init__(self, headless: bool = False):
        self.api_url = os.getenv("SYNQX_API_URL", "http://localhost:8000/api/v1")
        self.client_id = os.getenv("SYNQX_CLIENT_ID")
        self.api_key = os.getenv("SYNQX_API_KEY")
        self.tags = os.getenv("SYNQX_TAGS", "default").split(",")
        self.max_workers = int(os.getenv("SYNQX_MAX_WORKERS", "0"))
        self.headless = headless

        if not self.client_id or not self.api_key:
            if not self.headless:
                console.print(
                    Panel(
                        "[bold red]Configuration Missing[/bold red]\nRun [cyan]"
                        "python install.py[/cyan] or [cyan]configure[/cyan] command.",
                        border_style="red",
                    )
                )
            sys.exit(1)

        # Initialize Components
        self.client = AgentAPIClient(self.api_url, self.client_id, self.api_key)
        self.ephemeral_handler = EphemeralHandler(self.client, HOME_CONFIG_DIR)
        self.pipeline_handler = PipelineHandler(self.client, self.max_workers)
        self.system_handler = SystemHandler(self.client, HOME_CONFIG_DIR)

        self.running = True
        self.last_heartbeat = 0

        signal.signal(signal.SIGINT, self._handle_exit)
        if platform.system() != "Windows":
            signal.signal(signal.SIGTERM, self._handle_exit)

    def _handle_exit(self, signum, frame):
        logger.info(f"[STOP] Signal {signum} received. Shutting down...")
        self.running = False
        if PID_FILE.exists():
            try:
                PID_FILE.unlink()
            except Exception:
                pass
        sys.exit(0)

    def run(self):
        try:
            PID_FILE.write_text(str(os.getpid()))
        except Exception as e:
            logger.error(f"Could not write PID file: {e}")

        logger.info(f"[ONLINE] SynqX Agent Online. ID: {self.client_id}")

        if not self.client.heartbeat():
            logger.error("Initial heartbeat failed. Check connectivity.")
            # Continue anyway to retry in loop

        self.last_heartbeat = time.time()
        consecutive_errors = 0

        while self.running:
            try:
                # Heartbeat
                if time.time() - self.last_heartbeat > 30:
                    if self.client.heartbeat():
                        consecutive_errors = 0
                    self.last_heartbeat = time.time()

                # Poll
                data = self.client.poll(self.tags)
                if data:
                    consecutive_errors = 0
                    if data.get("job"):
                        self.pipeline_handler.process(data)
                    elif data.get("ephemeral"):
                        eph = data["ephemeral"]
                        if eph["type"] == "system":
                            self.system_handler.process(eph)
                        else:
                            self.ephemeral_handler.process(eph)

                # Dynamic backoff on errors handled inside client/poll,
                # but main loop sleep is constant
                time.sleep(2)

            except PermissionError:
                logger.critical("Auth Token Rejected. Stopping.")
                self.running = False
            except Exception as e:
                consecutive_errors += 1
                logger.exception(f"Unexpected error in main loop: {e}")
                time.sleep(min(30, 5 * consecutive_errors))


# --- CLI Commands ---


@app.command()
def start(
    daemon: bool = Option(False, "--daemon", "-d", help="Run in background"),
    log_level: str = Option("INFO", help="Logging level"),
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
                PID_FILE.unlink()
        except Exception:
            PID_FILE.unlink(missing_ok=True)

    if daemon and platform.system() != "Windows":
        try:
            pid = os.fork()
            if pid > 0:
                console.print(
                    f"[green]Agent started in background (PID: {pid})[/green]"
                )
                sys.exit(0)
        except OSError:
            sys.exit(1)

        os.setsid()
        try:
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError:
            sys.exit(1)

        sys.stdout.flush()
        sys.stderr.flush()
        with open(os.devnull, "rb") as f:
            os.dup2(f.fileno(), sys.stdin.fileno())
        with open(LOG_FILE, "ab") as f:
            os.dup2(f.fileno(), sys.stdout.fileno())
            os.dup2(f.fileno(), sys.stderr.fileno())

    console.print(
        Panel.fit(
            f"[bold blue]SynqX Agent[/bold blue] v1.0.0\n"
            f"ID: [green]{os.getenv('SYNQX_CLIENT_ID')}[/green]\n"
            f"API: [cyan]{os.getenv('SYNQX_API_URL')}[/cyan]",
            title="Lifecycle",
            border_style="blue",
        )
    )

    runtime = AgentRuntime(headless=daemon)
    runtime.run()


@app.command()
def configure():
    """Interactive credential setup."""
    console.print("[bold]Agent Configuration[/bold]")
    api_url = Prompt.ask(
        "API URL", default=os.getenv("SYNQX_API_URL", "http://localhost:8000/api/v1")
    )
    client_id = Prompt.ask("Client ID", default=os.getenv("SYNQX_CLIENT_ID", ""))
    api_key = Prompt.ask("API Key", password=True)

    set_key(str(ENV_FILE), "SYNQX_API_URL", api_url)
    set_key(str(ENV_FILE), "SYNQX_CLIENT_ID", client_id)
    set_key(str(ENV_FILE), "SYNQX_API_KEY", api_key)
    console.print("[bold green]✓[/bold green] Configuration saved.")


@app.command()
def status():
    """Check agent status."""
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                proc = psutil.Process(pid)
                uptime = datetime.fromtimestamp(proc.create_time()).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                console.print(f"[bold green]RUNNING[/bold green] (PID: {pid})")
                console.print(f"Uptime: {uptime}")
            else:
                console.print("[bold yellow]STALE[/bold yellow]")
        except Exception:
            console.print("[bold red]ERROR[/bold red]")
    else:
        console.print("[bold yellow]STOPPED[/bold yellow]")


@app.command()
def stop():
    """Stop the agent."""
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                os.kill(pid, signal.SIGTERM)
                console.print("[bold green]✓[/bold green] Agent stopped.")
            else:
                PID_FILE.unlink(missing_ok=True)
                console.print("Agent was not running.")
        except Exception as e:
            console.print(f"[bold red]Error:[/bold red] {e}")
    else:
        console.print("Agent is not running.")


if __name__ == "__main__":
    app()
