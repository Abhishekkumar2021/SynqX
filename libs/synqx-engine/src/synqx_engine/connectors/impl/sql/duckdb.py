from typing import Dict, Any
from synqx_engine.connectors.impl.sql.base import SQLConnector

class DuckDBConnector(SQLConnector):
    """
    Connector for DuckDB (OLAP).
    """

    def validate_config(self) -> None:
        if not self.config.get("path") and not self.config.get("memory"):
            # If neither path nor memory is set, default to in-memory
            self.config["memory"] = True
            
    def _sqlalchemy_url(self) -> str:
        # duckdb:///path/to/file.db or duckdb:///:memory:
        if self.config.get("path"):
            return f"duckdb:///{self.config['path']}"
        return "duckdb:///:memory:"

    def _get_engine_options(self) -> Dict[str, Any]:
        # DuckDB might have specific options
        return {
            "pool_size": 1, # DuckDB is often single-process file access
            "max_overflow": 0,
            "pool_recycle": -1
        }
