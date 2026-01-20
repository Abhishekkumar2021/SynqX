import base64
import io
import logging
import time
from pathlib import Path
from typing import Any

from synqx_core.utils.serialization import sanitize_for_json
from synqx_engine.connectors.factory import ConnectorFactory
import polars as pl # Moved to top-level

from agent.components.api_client import AgentAPIClient

logger = logging.getLogger("SynqX-Handler-Ephemeral")


class EphemeralHandler:
    def __init__(self, client: AgentAPIClient, home_dir: Path):
        self.client = client
        self.home_dir = home_dir

    def validate_path(self, path: str) -> Path:
        """Securely validate that path is within the sandbox."""
        sandbox = self.home_dir / "sandbox"
        sandbox.mkdir(exist_ok=True)

        target = (sandbox / path).resolve()
        if not str(target).startswith(str(sandbox.resolve())):
            raise ValueError(f"Security Violation: Access denied to {path}")
        return target

    def process(self, data: dict[str, Any]):  # noqa: PLR0912, PLR0915
        job_id = data["id"]
        job_type = data["type"]
        payload = data["payload"]
        conn_data = data.get("connection")

        logger.info(f"[INFO] Processing Ephemeral {job_type.upper()} Request #{job_id}")
        start_time = time.time()

        try:
            if not conn_data:
                raise ValueError("Connection metadata missing")

            connector = ConnectorFactory.get_connector(
                conn_data["type"], conn_data["config"]
            )
            result_update = {"status": "success"}

            # --- Type: Explorer Query ---
            if job_type == "explorer":
                query = payload.get("query")
                limit = int(payload.get("limit", 100))
                offset = int(payload.get("offset", 0))
                params = payload.get("params", {})

                try:
                    # Prefer execute_query with params
                    if params:
                        results = connector.execute_query(
                            query=query, limit=limit, offset=offset, **params
                        )
                    else:
                        results = connector.execute_query(
                            query=query, limit=limit, offset=offset
                        )
                except (NotImplementedError, AttributeError):
                    # Fallback for non-SQL sources
                    results = connector.fetch_sample(
                        asset=query, limit=limit, offset=offset
                    )

                if results:
                    # Try Arrow serialization for performance
                    try:
                        import polars as pl

                        df = pl.from_dicts(results)
                        buffer = io.BytesIO()
                        df.write_ipc(buffer)
                        result_update["result_sample_arrow"] = base64.b64encode(
                            buffer.getvalue()
                        ).decode("utf-8")
                    except Exception:
                        # Fallback to JSON rows
                        result_update["result_sample"] = {"rows": results[:1000]}

                result_update["result_summary"] = {"count": len(results)}

            # --- Type: Metadata / Discovery ---
            elif job_type == "metadata":
                task = payload.get("task_type")
                if task == "discover_assets":
                    result_update["result_sample"] = {
                        "assets": connector.discover_assets(
                            pattern=payload.get("pattern"),
                            include_metadata=payload.get("include_metadata", False),
                        )
                    }
                elif task == "asset_details":
                    asset = payload.get("asset")
                    if asset and hasattr(connector, "get_asset_details"):
                        result_update["result_sample"] = connector.get_asset_details(
                            asset
                        )
                    else:
                        result_update["result_sample"] = {}
                elif task == "list documents":
                    entity_ids = payload.get("entity_ids", [])
                    entity_table = payload.get("entity_table", "WELL")
                    if hasattr(connector, "list_documents"):
                        result_update["result_sample"] = {
                            "documents": connector.list_documents(
                                entity_ids, entity_table
                            )
                        }
                    else:
                        result_update["result_sample"] = {"documents": []}
                else:
                    asset = payload.get("asset")
                    if asset:
                        result_update["result_sample"] = {
                            "schema": connector.infer_schema(asset)
                        }

            # --- Type: Connectivity Test ---
            elif job_type == "test":
                with connector.session() as sess:
                    sess.test_connection()
                result_update["result_summary"] = {"message": "Verification Successful"}

            # --- Type: File Operations (Sandboxed) ---
            elif job_type == "file":
                action = payload.get("action")
                path = str(self.validate_path(payload.get("path", "")))

                if action == "list":
                    result_update["result_sample"] = {
                        "files": connector.list_files(path=path)
                    }
                elif action == "mkdir":
                    connector.create_directory(path=path)
                elif action == "read":
                    content = connector.download_file(path=path)
                    result_update["result_sample"] = {
                        "content": base64.b64encode(content).decode("utf-8")
                    }
                elif action == "write":
                    connector.upload_file(
                        path=path, content=base64.b64decode(payload.get("content"))
                    )
                elif action == "delete":
                    connector.delete_file(path=path)

            # Finalize
            result_update["execution_time_ms"] = int((time.time() - start_time) * 1000)
            self.client.report_ephemeral_status(
                job_id, sanitize_for_json(result_update)
            )
            logger.info(f"[SUCCESS] Ephemeral Request #{job_id} complete.")

        except Exception as e:
            logger.exception(f"[FAILED] Ephemeral Request #{job_id} FAILED")
            self.client.report_ephemeral_status(
                job_id, {"status": "failed", "error_message": str(e)}
            )
