#!/usr/bin/env python3
"""
SynqX Agent Installer - Enhanced Edition
========================================
Handles standardized environment setup, dependency management, and configuration.
Supports both development and portable/offline installation modes.
"""

import os
import sys
import argparse
import subprocess
import shutil
import platform
import logging
from pathlib import Path
from typing import List, Optional

# --- Logging Setup (Mirroring Project Style) ---
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

def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_formatter = ColoredFormatter('%(levelname)s - %(message)s')
    console_handler.setFormatter(console_formatter)
    
    logger.handlers = [console_handler]

# --- Utilities ---
def run_cmd(cmd: List[str], cwd: Path = None, check: bool = True):
    """Executes a command with logging."""
    logging.debug(f"Running: {' '.join(cmd)}")
    try:
        subprocess.check_call(cmd, cwd=cwd)
        return True
    except subprocess.CalledProcessError as e:
        if check:
            logging.error(f"Command failed with exit code {e.returncode}: {' '.join(cmd)}")
            sys.exit(e.returncode)
        return False

def get_pip_cmd() -> List[str]:
    """Returns the pip command, using 'uv pip' if available."""
    if shutil.which("uv"):
        return ["uv", "pip"]
    return [sys.executable, "-m", "pip"]

def is_venv() -> bool:
    """Checks if currently running inside a virtual environment."""
    return (
        hasattr(sys, 'real_prefix') or 
        (sys.base_prefix != sys.prefix) or
        os.environ.get('VIRTUAL_ENV') is not None
    )

# --- Core Logic ---
def main():
    parser = argparse.ArgumentParser(description="SynqX Agent Installer")
    parser.add_argument("--api-url", default="http://localhost:8000/api/v1", help="SynqX API URL")
    parser.add_argument("--client-id", help="Agent Client ID")
    parser.add_argument("--api-key", help="Agent API Key")
    parser.add_argument("--tags", default="default", help="Agent Tags")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--force", action="store_true", help="Force installation even if not in venv")
    
    args = parser.parse_args()
    setup_logging(args.verbose)

    logging.info("Initializing SynqX Agent Environment Setup...")

    # 1. Environment Validation
    if not is_venv() and not args.force:
        logging.warning("No virtual environment detected.")
        logging.info("Recommendation: Create and activate a venv first:")
        if platform.system() == "Windows":
            logging.info("  python -m venv .venv && .venv\\Scripts\\activate")
        else:
            logging.info("  python3 -m venv .venv && source .venv/bin/activate")
        
        response = input("\nContinue installation in global environment? (y/N): ")
        if response.lower() != 'y':
            logging.info("Installation aborted.")
            sys.exit(0)

    # 2. Configuration Persistence
    home_dir = Path.home()
    install_dir = home_dir / ".synqx-agent"
    install_dir.mkdir(exist_ok=True)
    env_file = install_dir / ".env"

    if args.client_id and args.api_key:
        logging.info(f"Persisting configuration to {env_file}...")
        env_content = (
            f"SYNQX_API_URL={args.api_url}\n"
            f"SYNQX_CLIENT_ID={args.client_id}\n"
            f"SYNQX_API_KEY={args.api_key}\n"
            f"SYNQX_TAGS={args.tags}\n"
        )
        env_file.write_text(env_content)
    elif not env_file.exists():
        logging.warning("Credentials not provided and .env file missing.")
        logging.warning("Agent will require manual configuration before it can start.")

    # 3. Dependency Installation
    logging.info("Installing dependencies...")
    pip_base = get_pip_cmd()
    current_dir = Path.cwd()
    packages_dir = current_dir / "packages"
    
    try:
        # Upgrade pip if using standard pip
        if "uv" not in pip_base:
            logging.debug("Upgrading pip...")
            run_cmd([sys.executable, "-m", "pip", "install", "--upgrade", "pip", "--quiet"])

        if packages_dir.exists() and packages_dir.is_dir():
            logging.info("Bundled packages found. Performing offline/portable installation...")
            wheels = list(packages_dir.glob("*.whl"))
            if wheels:
                logging.info(f"Installing {len(wheels)} bundled wheels...")
                run_cmd(pip_base + ["install"] + [str(w) for w in wheels] + ["--no-index", "--find-links", str(packages_dir)])
            
            # Install current agent code
            logging.info("Installing synqx-agent package...")
            run_cmd(pip_base + ["install", "-e", ".", "--no-deps"])
            
            # Install requirements if any missed
            req_file = current_dir / "requirements.txt"
            if req_file.exists():
                logging.info("Ensuring all requirements are met...")
                run_cmd(pip_base + ["install", "-r", str(req_file)])
        else:
            logging.info("Development mode: Installing from source with remote dependencies...")
            run_cmd(pip_base + ["install", "-e", "."])

        # 4. Verification
        logging.info("Verifying installation...")
        try:
            # We try to run the script we just installed
            # It might not be in PATH yet if we just installed it, so we try via python -m or direct call
            result = subprocess.run([sys.executable, "main.py", "--help"], capture_output=True, text=True)
            if result.returncode == 0:
                logging.info("[OK] Verification successful!")
            else:
                logging.debug(f"Verification help output: {result.stderr}")
        except Exception as e:
            logging.warning(f"Could not verify installation immediately: {e}")

        logging.info("\n" + "="*50)
        logging.info(" SynqX Agent Installation Complete!")
        logging.info("="*50)
        
        if not is_venv():
            logging.warning("NOTE: Installed in global environment. This is not recommended.")
        
        logging.info("\nQuick Start:")
        logging.info(f"1. Configuration is at: {env_file}")
        logging.info("2. To launch the agent, run:")
        logging.info("   synqx-agent start")
        logging.info("="*50 + "\n")

    except Exception as e:
        logging.error(f"Installation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()