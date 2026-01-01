import sys
from typing import Any, Dict, Iterator, List, Optional, Union
import os
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from app.connectors.base import BaseConnector
from app.core.errors import ConfigurationError, ConnectionFailedError
from app.core.logging import get_logger

try:
    from cassandra.cluster import Cluster
    from cassandra.auth import PlainTextAuthProvider
    from cassandra.io.asynciobackend import AsyncioConnection
except (ImportError, Exception):
    Cluster = None
    PlainTextAuthProvider = None
    AsyncioConnection = None

logger = get_logger(__name__)

class CassandraConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    contact_points: List[str] = Field(..., description="List of cluster nodes IP/Host")
    port: int = Field(9042, description="Cassandra Port")
    keyspace: str = Field(..., description="Default Keyspace")
    username: Optional[str] = Field(None, description="Username")
    password: Optional[str] = Field(None, description="Password")
    use_asyncio: bool = Field(False, description="Whether to use AsyncioConnection (recommended True only for asyncio apps, defaults to False for sync compatibility)")

class CassandraConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if Cluster is None:
            raise ConfigurationError("Cassandra driver not installed. Run 'pip install cassandra-driver'.")
        
        # Workaround for Python 3.13 C-extension issues if they occur
        # Some environments might have trouble with compiled extensions in 3.13
        if os.environ.get("CASS_DRIVER_NO_EXTENSIONS") == "1":
            logger.info("Cassandra driver: C extensions disabled via environment variable.")

        self._config_model: Optional[CassandraConfig] = None
        self._cluster: Optional[Cluster] = None
        self._session = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            if isinstance(self.config.get("contact_points"), str):
                self.config["contact_points"] = [cp.strip() for cp in self.config["contact_points"].split(",")]
            self._config_model = CassandraConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Cassandra configuration: {e}")

    def connect(self) -> None:
        if self._session:
            return
        
        auth_provider = None
        if self._config_model.username:
            auth_provider = PlainTextAuthProvider(
                username=self._config_model.username,
                password=self._config_model.password
            )
            
        try:
            cluster_kwargs = {
                "contact_points": self._config_model.contact_points,
                "port": self._config_model.port,
                "auth_provider": auth_provider,
            }

            # For Python 3.12/3.13, AsyncioConnection can be used but requires careful loop handling in sync apps.
            # We default to standard connection (Sync) which is safer for this Connector architecture.
            # However, for 3.12+, AsyncioConnection is required if C-extensions are missing.
            if (self._config_model.use_asyncio or sys.version_info >= (3, 12)) and AsyncioConnection:
                cluster_kwargs["connection_class"] = AsyncioConnection
                logger.info("Using AsyncioConnection for Cassandra")

            self._cluster = Cluster(**cluster_kwargs)
            self._session = self._cluster.connect(self._config_model.keyspace)
        except (Exception, RuntimeError) as e:
            # Fallback: if AsyncioConnection failed (e.g. no running loop) or driver issue
            if "connection_class" in cluster_kwargs:
                logger.warning(f"Failed to connect with AsyncioConnection ({e}), retrying with default connection class")
                try:
                    del cluster_kwargs["connection_class"]
                    self._cluster = Cluster(**cluster_kwargs)
                    self._session = self._cluster.connect(self._config_model.keyspace)
                    return
                except Exception as e2:
                    raise ConnectionFailedError(f"Failed to connect to Cassandra (Default Fallback): {e2}")
            
            # If standard connection failed, check for C-extension issues common on Windows
            if "No module named" in str(e) or "DLL load failed" in str(e):
                 logger.warning("Potential C-extension issue detected. Try setting CASS_DRIVER_NO_EXTENSIONS=1")
            
            raise ConnectionFailedError(f"Failed to connect to Cassandra: {e}")

    def disconnect(self) -> None:
        if self._cluster:
            self._cluster.shutdown()
            self._cluster = None
            self._session = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                self._session.execute("SELECT now() FROM system.local")
                return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        # In Cassandra, assets are tables within the keyspace
        keyspace_meta = self._cluster.metadata.keyspaces.get(self._config_model.keyspace)
        if not keyspace_meta:
            return []
            
        assets = []
        for table_name in keyspace_meta.tables.keys():
            if pattern and pattern not in table_name:
                continue
                
            asset = {
                "name": table_name,
                "fully_qualified_name": f"{self._config_model.keyspace}.{table_name}",
                "type": "table"
            }
            assets.append(asset)
        return assets

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        self.connect()
        keyspace_meta = self._cluster.metadata.keyspaces.get(self._config_model.keyspace)
        table_meta = keyspace_meta.tables.get(asset)
        
        if not table_meta:
            return {"asset": asset, "columns": [], "type": "table"}
            
        columns = []
        for col_name, col_meta in table_meta.columns.items():
            c_type = str(col_meta.cql_type).lower()
            # Basic mapping
            synqx_type = "string"
            if "int" in c_type:
                synqx_type = "integer"
            elif "float" in c_type or "decimal" in c_type or "double" in c_type:
                synqx_type = "float"
            elif "boolean" in c_type:
                synqx_type = "boolean"
            elif "timestamp" in c_type:
                synqx_type = "datetime"
            
            columns.append({
                "name": col_name,
                "type": synqx_type,
                "native_type": c_type
            })
            
        return {
            "asset": asset,
            "columns": columns,
            "type": "table"
        }

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        query = f"SELECT * FROM {asset}"
        if limit:
            query += f" LIMIT {limit}"
            
        # Cassandra doesn't support OFFSET well. Real impl would use paging state.
        # For simplicity, we fetch and yield chunks.
        from cassandra.query import SimpleStatement
        statement = SimpleStatement(query, fetch_size=kwargs.get("batch_size", 1000))
        
        results = self._session.execute(statement)
        
        # Generator for rows
        def row_generator(rs):
            for row in rs:
                yield row._asdict()
                
        # Batching rows into DataFrames
        batch = []
        for row in row_generator(results):
            batch.append(row)
            if len(batch) >= statement.fetch_size:
                yield pd.DataFrame(batch)
                batch = []
        
        if batch:
            yield pd.DataFrame(batch)

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        # mode support: Cassandra is naturally upsert-heavy
        
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        total = 0
        
        for df in iterator:
            # Note: Large batches should be handled carefully in Cassandra
            # For this prototype, we do row-by-row or small BatchStatements
            for _, row in df.iterrows():
                cols = ", ".join(row.index)
                placeholders = ", ".join(["%s"] * len(row))
                query = f"INSERT INTO {asset} ({cols}) VALUES ({placeholders})"
                self._session.execute(query, tuple(row.values))
                total += 1
        return total

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        self.connect()
        rows = self._session.execute(query)
        return [row._asdict() for row in rows]
