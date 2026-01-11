from typing import Iterator
import pandas as pd
from synqx_engine.transforms.base import BaseTransform
from synqx_engine.connectors.factory import ConnectorFactory
from synqx_core.errors import ConfigurationError
from app.services.vault_service import VaultService
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class DbtTransform(BaseTransform):
    """
    Operator that triggers a dbt command.
    Usually used as a standalone node or at the end of a chain.
    """
    def validate_config(self) -> None:
        if not self.config.get("connection_id"):
            raise ConfigurationError("DBT Transform requires 'connection_id'.")
        if not self.config.get("command"):
            raise ConfigurationError("DBT Transform requires 'command'.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        # dbt nodes are often "side-effect" nodes. 
        # We trigger the command once per execution.
        command_triggered = False
        
        # If there's upstream data, we pass it through
        for df in data:
            if not command_triggered:
                self._execute_dbt()
                command_triggered = True
            yield df
            
        # If no data reached here yet (e.g. standalone node), trigger it now
        if not command_triggered:
             self._execute_dbt()

    def _execute_dbt(self):
        connection_id = self.config.get("connection_id")
        command = self.config.get("command")
        
        # 1. Resolve Connection from injected DB session
        db = self.config.get("_db")
        if not db:
            # Fallback to creating a new session if not injected (e.g. unit tests)
            from app.db.session import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
            
        try:
            from synqx_core.models.connections import Connection
            conn = db.query(Connection).filter(Connection.id == connection_id).first()
            if not conn:
                raise ValueError(f"Connection {connection_id} not found for dbt task.")
            
            cfg = VaultService.get_connector_config(conn)
            # Inject execution context (very important for dbt to find its venv)
            cfg["execution_context"] = {
                "python_executable": self.config.get("python_executable"),
                "env_path": self.config.get("env_path")
            }
            
            connector = ConnectorFactory.get_connector(conn.connector_type.value, cfg)
            
            # 2. Execute
            logger.info(f"Triggering dbt command via backend: {command}")
            connector.execute_query(command)
        finally:
            if should_close:
                db.close()
