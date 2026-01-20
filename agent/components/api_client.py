import logging
import platform
import socket
import sys
import time
from datetime import UTC, datetime
from typing import Any
from http import HTTPStatus # Import HTTPStatus

import psutil
import requests

logger = logging.getLogger("SynqX-Agent-Client")

class AgentAPIClient:
    def __init__(self, api_url: str, client_id: str, api_key: str):
        self.api_url = api_url
        self.client_id = client_id
        self.api_key = api_key
        self.hostname = socket.gethostname()
        try:
            self.ip_address = socket.gethostbyname(self.hostname)
        except socket.gaierror:
            self.ip_address = "127.0.0.1"
            
        self.session = requests.Session()
        self.session.headers.update({
            "X-SynqX-Client-ID": self.client_id,
            "X-SynqX-API-Key": self.api_key,
            "Content-Type": "application/json",
        })
        self._telemetry_cache = {}
        self.THROTTLING_INTERVAL_SECONDS = 2 # Constant for throttling non-terminal status updates

    def heartbeat(self) -> bool:
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
                    "arch": platform.machine(),
                },
                "ip_address": self.ip_address,
                "version": "1.0.0",
                "hostname": self.hostname,
            }
            resp = self.session.post(
                f"{self.api_url}/agents/heartbeat", json=payload, timeout=5
            )
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.debug(f"Heartbeat failed: {e}")
            return False

    def poll(self, tags: list[str]) -> dict[str, Any] | None:
        try:
            resp = self.session.post(
                f"{self.api_url}/agents/poll", json=tags, timeout=15
            )
            if resp.status_code == HTTPStatus.OK:
                return resp.json()
            elif resp.status_code == HTTPStatus.UNAUTHORIZED:
                logger.error("Authentication failed during poll.")
                raise PermissionError("Invalid Credentials")
            elif resp.status_code >= HTTPStatus.INTERNAL_SERVER_ERROR:
                logger.warning(f"Server error ({resp.status_code}).")
                return None
        except requests.exceptions.RequestException as e:
            logger.debug(f"Network error during poll: {e}")
            return None
        return None

    def report_job_status(
        self,
        job_id: int,
        status: str,
        message: str = "",
        duration: int = 0,
        records: int = 0,
    ):
        payload = {
            "status": status,
            "message": message,
            "execution_time_ms": duration,
            "total_records": records,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        try:
            self.session.post(
                f"{self.api_url}/agents/jobs/{job_id}/status", json=payload, timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to report job status for #{job_id}: {e}")

    def report_step_status(
        self, job_id: int, node_id: str, status: str, data: dict[str, Any] | None = None
    ):
        now = time.time()
        is_terminal = status.lower() in ["success", "failed"]
        last_report = self._telemetry_cache.get(node_id, 0)

        # Throttling non-terminal status updates
        if not is_terminal and (now - last_report < self.THROTTLING_INTERVAL_SECONDS):
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
            "sample_data": data.get("sample_data"),
        }

        try:
            proc = psutil.Process()
            payload["cpu_percent"] = proc.cpu_percent()
            payload["memory_mb"] = proc.memory_info().rss / (1024 * 1024)
        except Exception:
            pass

        try:
            resp = self.session.post(
                f"{self.api_url}/agents/jobs/{job_id}/steps", json=payload, timeout=2
            )
            if resp.status_code == HTTPStatus.OK:
                self._telemetry_cache[node_id] = now
        except Exception:
            pass

    def send_logs(self, job_id: int, level: str, message: str, node_id: str | None = None):
        payload = [
            {
                "level": level,
                "message": message,
                "timestamp": datetime.now(UTC).isoformat(),
                "node_id": node_id,
            }
        ]
        try:
            self.session.post(
                f"{self.api_url}/agents/jobs/{job_id}/logs", json=payload, timeout=5
            )
        except Exception:
            pass

    def report_ephemeral_status(self, job_id: int, payload: dict[str, Any]):
        try:
            self.session.post(
                f"{self.api_url}/agents/jobs/ephemeral/{job_id}/status",
                json=payload,
                timeout=10,
            )
        except Exception as e:
            logger.error(f"Failed to report ephemeral status for #{job_id}: {e}")
