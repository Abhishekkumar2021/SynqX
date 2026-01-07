from typing import Iterator
import pandas as pd
import logging
from engine.transforms.base import BaseTransform
from engine.connectors.factory import ConnectorFactory
from engine.core.errors import ConfigurationError

logger = logging.getLogger("SynqX-Agent-Executor")

class DbtTransform(BaseTransform):
    """
    Operator that triggers a dbt command on the remote agent.
    """
    def validate_config(self) -> None:
        if not self.config.get("connection_id"):
            raise ConfigurationError("DBT Transform requires 'connection_id'.")
        if not self.config.get("command"):
            raise ConfigurationError("DBT Transform requires 'command'.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        command_triggered = False
        for df in data:
            if not command_triggered:
                self._execute_dbt()
                command_triggered = True
            yield df
            
        if not command_triggered:
             self._execute_dbt()

    def _execute_dbt(self):
        connection_id = str(self.config.get("connection_id"))
        command = self.config.get("command")
        
        connections = self.config.get("_connections", {})
        conn_data = connections.get(connection_id)
        
        if not conn_data:
            raise ValueError(f"Connection {connection_id} not found in agent context for dbt task.")
            
        # 1. Prepare Config
        cfg = {**conn_data.get("config", {})}
        # Preserve existing context if any
        cfg["execution_context"] = {
            "python_executable": self.config.get("python_executable"),
            "env_path": self.config.get("env_path")
        }
        
        # 2. Get Connector
        connector = ConnectorFactory.get_connector(conn_data["type"], cfg)
        
        # 3. Execute
        logger.info(f"Triggering dbt command via agent: {command}")
        connector.execute_query(command)
