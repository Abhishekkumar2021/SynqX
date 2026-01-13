#!/usr/bin/env python3
import os
import sys
import argparse
import subprocess
import platform
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="SynqX Agent Installer")
    parser.add_argument("--api-url", default="http://localhost:8000/api/v1", help="SynqX API URL")
    parser.add_argument("--client-id", required=True, help="Agent Client ID")
    parser.add_argument("--api-key", required=True, help="Agent API Key")
    parser.add_argument("--tags", default="default", help="Agent Tags")
    
    args = parser.parse_args()

    print("Standardizing SynqX Agent Environment...")

    # Determine paths
    home_dir = Path.home()
    install_dir = home_dir / ".synqx-agent"
    install_dir.mkdir(exist_ok=True)
    
    env_file = install_dir / ".env"
    
    # 1. Persist Configuration
    print(f"Persisting configuration to {env_file}...")
    env_content = (
        f"SYNQX_API_URL={args.api_url}\n"
        f"SYNQX_CLIENT_ID={args.client_id}\n"
        f"SYNQX_API_KEY={args.api_key}\n"
        f"SYNQX_TAGS={args.tags}\n"
    )
    env_file.write_text(env_content)

    # 2. Install Dependencies
    print("Installing synqx-agent CLI...")
    
    # Check if running in a venv is usually recommended before this script, 
    # but we can try to install in the current environment.
    
    current_dir = Path.cwd()
    packages_dir = current_dir / "packages"
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        
        if packages_dir.exists() and packages_dir.is_dir():
            print("[INFO] Found bundled packages. Installing in Offline/Portable mode...")
            # Install wheels
            wheels = list(packages_dir.glob("*.whl"))
            if wheels:
                cmd = [sys.executable, "-m", "pip", "install"] + [str(w) for w in wheels]
                subprocess.check_call(cmd)
            
            # Install agent (editable or normal)
            # In portable mode, we usually install the current dir
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-e", ".", "--no-deps"])
            
            # Install other deps
            if (current_dir / "requirements.txt").exists():
                subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        else:
            # Dev mode
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-e", "."])
            
        print("\n[SUCCESS] Installation Complete!")
        print("------------------------------------------------")
        if platform.system() == "Windows":
             print(f"Ensure your venv is active if you used one.")
        else:
             print(f"Ensure your venv is active if you used one.")
        print("Run 'synqx-agent start' to launch.")
        print("------------------------------------------------")

    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Installation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
