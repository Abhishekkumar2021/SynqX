from typing import Any, Dict, List, Optional, Iterator, Union
import pandas as pd
import subprocess
import os
import json
from engine.connectors.base import BaseConnector
from engine.core.errors import ConfigurationError, ConnectionFailedError
from engine.core.logging import get_logger

logger = get_logger(__name__)

class DbtConnector(BaseConnector):
    """
    Connector for executing dbt (data build tool) projects.
    Leverages isolated environments via DependencyService context if available.
    """

    def validate_config(self) -> None:
        if not self.config.get("project_path") and not self.config.get("git_url"):
            raise ConfigurationError("DBT Connector requires 'project_path' (local) or 'git_url' (remote).")

    def connect(self) -> None:
        pass

    def disconnect(self) -> None:
        pass

    def _get_exec_command(self) -> List[str]:
        # Determine execution context (isolated python env)
        context = self.config.get("execution_context", {})
        python_exe = context.get("python_executable", "python3")
        
        if "venv" in python_exe or "virtualenv" in python_exe:
            dbt_exe = os.path.join(os.path.dirname(python_exe), "dbt")
            if os.path.exists(dbt_exe):
                return [dbt_exe]
        
        return [python_exe, "-m", "dbt"]

    def _run_dbt(self, args: List[str]) -> str:
        cmd = self._get_exec_command() + args
        cwd = self.config.get("project_path", os.getcwd())
        
        try:
            logger.info(f"Executing dbt command: {' '.join(cmd)} in {cwd}")
            result = subprocess.run(
                cmd, 
                cwd=cwd, 
                capture_output=True, 
                text=True, 
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            logger.error(f"dbt execution failed: {e.stderr}")
            raise ConnectionFailedError(f"dbt command failed: {e.stderr}")

    def test_connection(self) -> bool:
        try:
            self._run_dbt(["debug"])
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        project_path = self.config.get("project_path")
        manifest_path = os.path.join(project_path, "target", "manifest.json")
        
        if not os.path.exists(manifest_path):
            try:
                self._run_dbt(["compile"])
            except Exception as e:
                logger.warning(f"Could not compile dbt project to generate manifest: {e}")
                return []

        if not os.path.exists(manifest_path):
            return []

        try:
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            
            assets = []
            for key, node in manifest.get("nodes", {}).items():
                if node.get("resource_type") == "model":
                    name = node.get("name")
                    if pattern and pattern.lower() not in name.lower():
                        continue
                        
                    assets.append({
                        "name": name,
                        "fully_qualified_name": key,
                        "type": "table",
                        "schema": node.get("schema"),
                        "description": node.get("description")
                    })
            return assets
        except Exception as e:
            logger.error(f"Failed to parse dbt manifest: {e}")
            return []

    def infer_schema(
        self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs
    ) -> Dict[str, Any]:
        project_path = self.config.get("project_path")
        manifest_path = os.path.join(project_path, "target", "manifest.json")
        
        columns = []
        if os.path.exists(manifest_path):
            try:
                with open(manifest_path, "r") as f:
                    manifest = json.load(f)
                target_node = None
                for key, node in manifest.get("nodes", {}).items():
                    if node.get("name") == asset or key == asset:
                        target_node = node
                        break
                
                if target_node:
                    for col_name, col_data in target_node.get("columns", {}).items():
                        columns.append({
                            "name": col_name,
                            "type": col_data.get("data_type", "unknown"),
                            "description": col_data.get("description")
                        })
            except Exception:
                pass
                
        return {
            "asset": asset,
            "columns": columns
        }

    def read_batch(
        self, asset: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs
    ) -> Iterator[pd.DataFrame]:
        raise NotImplementedError("Direct data reading from dbt connector not supported.")

    def write_batch(
        self, data: Union[pd.DataFrame, Iterator[pd.DataFrame]], asset: str, mode: str = "append", **kwargs
    ) -> int:
        raise NotImplementedError("Writing data to dbt project not supported.")

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        cmd = query.split()
        if cmd[0] == "dbt":
            cmd = cmd[1:]
            
        output = self._run_dbt(cmd)
        return [{"output": output}]
