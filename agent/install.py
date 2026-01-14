#!/usr/bin/env python3
"""
SynqX Agent Installer - Industrial Edition
==========================================
Standardized environment setup and configuration for SynqX Agents.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from typing import Optional

# --- Mandatory Dependency Check ---
try:
    import typer
    from typer import Typer, Option
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt, Confirm
except ImportError:
    print("\n[!] Installation Error: Typer and Rich are required for the installer.")
    print("    Please run: pip install typer rich\n")
    sys.exit(1)

app = Typer(help="SynqX Agent Installer", add_completion=False)
console = Console()

# --- Constants ---
HOME_CONFIG_DIR = Path.home() / ".synqx-agent"
ENV_FILE = HOME_CONFIG_DIR / ".env"

def is_venv() -> bool:
    """Check if the script is running inside a virtual environment."""
    return (
        hasattr(sys, "real_prefix") or
        (sys.base_prefix != sys.prefix) or
        os.environ.get("VIRTUAL_ENV") is not None
    )

def get_pip_command() -> list:
    """Determine the best pip command to use."""
    if shutil.which("uv"):
        return ["uv", "pip", "install"]
    return [sys.executable, "-m", "pip", "install"]

def run_step(msg: str, cmd: list, cwd: Optional[Path] = None):
    """Execute a shell command with a status indicator."""
    with console.status(f"[cyan]{msg}...[/cyan]"):
        try:
            # Using subprocess.run for better control and error capturing
            result = subprocess.run(
                cmd, 
                cwd=cwd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True
            )
            if result.returncode != 0:
                console.print(f"[bold red]Error in {msg}:[/bold red]\n{result.stderr}")
                raise subprocess.CalledProcessError(result.returncode, cmd, output=result.stdout, stderr=result.stderr)
        except Exception as e:
            console.print(f"[bold red]Exception during {msg}:[/bold red] {str(e)}")
            raise

@app.command()
def install(
    api_url: str = Option("http://localhost:8000/api/v1", help="SynqX API Gateway URL"),
    client_id: Optional[str] = Option(None, help="Agent Identity ID"),
    api_key: Optional[str] = Option(None, help="Agent Security Key"),
    force: bool = Option(False, "--force", help="Bypass venv check"),
    skip_deps: bool = Option(False, "--skip-deps", help="Skip dependency installation")
):
    """Deploy and configure the SynqX Agent."""
    console.print(Panel.fit("[bold blue]SynqX Agent Deployment[/bold blue]", border_style="blue"))

    # 1. Environment Validation
    if not is_venv() and not force:
        console.print("[yellow]Warning:[/yellow] Not running in a virtual environment.")
        if not Confirm.ask("Do you want to continue with global installation? (Not recommended)"):
            raise typer.Abort()

    # 2. Filesystem Preparation
    HOME_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    # 3. Dependency Installation
    if not skip_deps:
        pip_cmd = get_pip_command()
        try:
            if (Path.cwd() / "requirements.txt").exists():
                run_step("Installing Agent dependencies", pip_cmd + ["-r", "requirements.txt"])
            
            # Install local libs if they exist in the expected relative paths
            libs_dir = Path.cwd().parent / "libs"
            if libs_dir.exists():
                for lib in ["synqx-core", "synqx-engine"]:
                    lib_path = libs_dir / lib
                    if lib_path.exists():
                        run_step(f"Installing {lib}", pip_cmd + ["-e", str(lib_path)])
            
            if (Path.cwd() / "pyproject.toml").exists():
                run_step("Installing Agent package", pip_cmd + ["-e", "."])
        except Exception as e:
            console.print(f"[bold red]Installation Failed:[/bold red] {e}")
            sys.exit(1)

    # 4. Configuration Persistence
    if not client_id or not api_key:
        # Only prompt if values aren't already in ENV_FILE or provided via CLI
        current_id = None
        current_key = None
        if ENV_FILE.exists():
            from dotenv import dotenv_values
            existing = dotenv_values(ENV_FILE)
            current_id = existing.get("SYNQX_CLIENT_ID")
            current_key = existing.get("SYNQX_API_KEY")

        if not client_id:
            client_id = Prompt.ask("Enter Client ID", default=current_id) if not current_id else current_id
        if not api_key:
            api_key = Prompt.ask("Enter API Key", password=True, default=current_key) if not current_key else current_key

    env_content = (
        f"SYNQX_API_URL={api_url}\n"
        f"SYNQX_CLIENT_ID={client_id}\n"
        f"SYNQX_API_KEY={api_key}\n"
        f"SYNQX_TAGS=default\n"
    )
    
    try:
        ENV_FILE.write_text(env_content)
        console.print(f"[bold green]✓[/bold green] Config persisted to {ENV_FILE}")
    except Exception as e:
        console.print(f"[bold red]Failed to save config:[/bold red] {e}")
        sys.exit(1)

    # 5. Final Verification
    try:
        # Use sys.executable to ensure we use the same environment
        run_step("Verifying installation", [sys.executable, "main.py", "version"])
        console.print(Panel.fit("[bold green]Success![/bold green] Agent is ready for service.", border_style="green"))
        console.print("\nTo start the agent, run:")
        console.print("  [bold blue]python main.py start[/bold blue]\n")
    except Exception:
        console.print("[red]Verification failed. Please check your dependencies and environment.[/red]")

if __name__ == "__main__":
    app()