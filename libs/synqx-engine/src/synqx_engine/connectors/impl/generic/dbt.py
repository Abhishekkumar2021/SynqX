import json
import os
import subprocess
from collections.abc import Iterator
from typing import Any

import pandas as pd
from synqx_core.errors import ConfigurationError, ConnectionFailedError
from synqx_core.logging import get_logger

from synqx_engine.connectors.base import BaseConnector

logger = get_logger(__name__)


class DbtConnector(BaseConnector):
    """
    Connector for executing dbt (data build tool) projects.
    Leverages isolated environments via DependencyService context if available.
    """

    def validate_config(self) -> None:
        if not self.config.get("project_path") and not self.config.get("git_url"):
            raise ConfigurationError(
                "DBT Connector requires 'project_path' (local) or 'git_url' (remote)."
            )

    def connect(self) -> None:
        # dbt is stateless/CLI based
        pass

    def disconnect(self) -> None:
        pass

    def _get_exec_command(self) -> list[str]:
        # Determine execution context (isolated python env)
        context = self.config.get("execution_context", {})
        python_exe = context.get("python_executable", "python3")

        # We assume dbt is installed in that env.
        # Ideally we invoke 'dbt' executable directly if it's in the bin/Scripts folder
        if "venv" in python_exe or "virtualenv" in python_exe:
            # Derive dbt path from python path
            # .../bin/python -> .../bin/dbt
            dbt_exe = os.path.join(os.path.dirname(python_exe), "dbt")
            if os.path.exists(dbt_exe):
                return [dbt_exe]

        # Fallback to system dbt or 'python -m dbt'
        return [python_exe, "-m", "dbt"]

    def _run_dbt(self, args: list[str]) -> str:
        cmd = self._get_exec_command() + args
        cwd = self.config.get("project_path", os.getcwd())

        # If git_url is used, we assume the repo is cloned to a workspace dir
        # handled by the DependencyService/Agent before this is called?
        # Or we clone it here?
        # For simplicity, we assume 'project_path' points to the dbt project root.

        try:
            logger.info(f"Executing dbt command: {' '.join(cmd)} in {cwd}")
            result = subprocess.run(
                cmd, cwd=cwd, capture_output=True, text=True, check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            logger.error(f"dbt execution failed: {e.stderr}")
            raise ConnectionFailedError(f"dbt command failed: {e.stderr}")  # noqa: B904

    def test_connection(self) -> bool:
        try:
            self._run_dbt(["debug"])
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: str | None = None, include_metadata: bool = False, **kwargs
    ) -> list[dict[str, Any]]:
        """
        Discovers dbt models by parsing target/manifest.json.
        Ensures 'dbt compile' is run first if manifest is missing.
        """
        project_path = self.config.get("project_path")
        manifest_path = os.path.join(project_path, "target", "manifest.json")

        if not os.path.exists(manifest_path):
            try:
                self._run_dbt(["compile"])
            except Exception as e:
                logger.warning(
                    f"Could not compile dbt project to generate manifest: {e}"
                )
                return []

        if not os.path.exists(manifest_path):
            return []

        try:
            with open(manifest_path) as f:
                manifest = json.load(f)

            assets = []
            for key, node in manifest.get("nodes", {}).items():
                if node.get("resource_type") == "model":
                    name = node.get("name")
                    if pattern and pattern.lower() not in name.lower():
                        continue

                    assets.append(
                        {
                            "name": name,
                            "fully_qualified_name": key,  # model.project.name
                            "type": "table",  # dbt models usually materialize as tables/views  # noqa: E501
                            "schema": node.get("schema"),
                            "description": node.get("description"),
                        }
                    )
            return assets
        except Exception as e:
            logger.error(f"Failed to parse dbt manifest: {e}")
            return []

    def infer_schema(
        self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs
    ) -> dict[str, Any]:
        # dbt doesn't easily return schema without querying the warehouse.
        # We could parse manifest 'columns' if documented.
        # For now, return empty or parse manifest.
        project_path = self.config.get("project_path")
        manifest_path = os.path.join(project_path, "target", "manifest.json")

        columns = []
        if os.path.exists(manifest_path):
            try:
                with open(manifest_path) as f:
                    manifest = json.load(f)
                # asset is likely the model name or FQN
                # Try to find the node
                target_node = None
                for key, node in manifest.get("nodes", {}).items():
                    if node.get("name") == asset or key == asset:
                        target_node = node
                        break

                if target_node:
                    for col_name, col_data in target_node.get("columns", {}).items():
                        columns.append(
                            {
                                "name": col_name,
                                "type": col_data.get("data_type", "unknown"),
                                "description": col_data.get("description"),
                            }
                        )
            except Exception:
                pass

        return {"asset": asset, "columns": columns}

    def read_batch(
        self,
        asset: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        # dbt doesn't read data. It transforms.
        # To preview, we'd need to connect to the warehouse using the profile.
        # This is complex. For now, raise NotImplemented.
        raise NotImplementedError(
            "Direct data reading from dbt connector not supported. Use the underlying warehouse connector."  # noqa: E501
        )

    def write_batch(
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        raise NotImplementedError("Writing data to dbt project not supported.")

    def execute_query(
        self,
        query: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> list[dict[str, Any]]:
        # Interpreting 'query' as a dbt command (e.g., "dbt run -s my_model")
        # OR generic CLI command.

        cmd = query.split()
        if cmd[0] == "dbt":
            cmd = cmd[1:]  # Strip 'dbt' as _run_dbt adds it

        output = self._run_dbt(cmd)

        # Wrap output in a single row result for display
        return [{"output": output}]
