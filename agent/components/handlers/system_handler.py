import logging
import platform
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from agent.components.api_client import AgentAPIClient
from synqx_core.utils.serialization import sanitize_for_json

logger = logging.getLogger("SynqX-Handler-System")


class SystemHandler:
    def __init__(self, client: AgentAPIClient, home_dir: Path):
        self.client = client
        self.home_dir = home_dir

    def process(self, data: dict[str, Any]):
        job_id = data["id"]
        payload = data["payload"]
        conn_data = data.get("connection")

        logger.info(f"[INFO] Processing System Request #{job_id}")
        start_time = time.time()
        result_update = {"status": "success"}

        try:
            if not conn_data:
                raise ValueError("Connection metadata missing")

            action = payload.get("action")
            lang = payload.get("language")
            pkg = payload.get("package")

            # Sandbox environments to .synqx-agent/envs
            base = self.home_dir / "envs" / str(conn_data["id"]) / lang
            base.mkdir(parents=True, exist_ok=True)

            if action == "initialize":
                if lang == "python":
                    subprocess.check_call(
                        [sys.executable, "-m", "venv", str(base / "venv")]
                    )

            elif action == "install":
                # Sanitize package name to prevent chaining
                if not re.match(r"^[a-zA-Z0-9_\-==.<>]+$", pkg):
                    raise ValueError(f"Invalid package name: {pkg}")

                bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
                pip = base / "venv" / bin_dir / "pip"
                out = subprocess.check_output([str(pip), "install", pkg], text=True)
                result_update["result_summary"] = {"output": out}

            elif action == "uninstall":
                if not re.match(r"^[a-zA-Z0-9_\-==.<>]+$", pkg):
                    raise ValueError(f"Invalid package name: {pkg}")

                bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
                pip = base / "venv" / bin_dir / "pip"
                out = subprocess.check_output(
                    [str(pip), "uninstall", "-y", pkg], text=True
                )
                result_update["result_summary"] = {"output": out}

            result_update["execution_time_ms"] = int((time.time() - start_time) * 1000)
            self.client.report_ephemeral_status(
                job_id, sanitize_for_json(result_update)
            )
            logger.info(f"[SUCCESS] System Request #{job_id} complete.")

        except Exception as e:
            logger.exception(f"[FAILED] System Request #{job_id} FAILED")
            self.client.report_ephemeral_status(
                job_id, {"status": "failed", "error_message": str(e)}
            )
