from typing import Optional
from sqlalchemy import text
from synqx_engine.connectors.impl.sql.base import SQLConnector
from synqx_core.errors import ConfigurationError
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

import logging
import pandas as pd
import time
from typing import Iterator, List
from synqx_core.errors import DataTransferError

logger = logging.getLogger(__name__)

class PostgresConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")
    host: str = Field(..., description="Database host")
    port: int = Field(5432, description="Database port")
    database: str = Field(..., description="Database name")
    db_schema: str = Field("public")
    cdc_slot_name: Optional[str] = Field(None)
    cdc_publication_name: Optional[str] = Field("synqx_pub")

class PostgresConnector(SQLConnector):
    """
    Robust PostgreSQL Connector using SQLAlchemy with Native CDC capabilities.
    """

    def validate_config(self) -> None:
        try:
            PostgresConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid PostgreSQL configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = PostgresConfig.model_validate(self.config)
        return (
            f"postgresql+psycopg2://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )

    def _get_table_size(self, table: str, schema: Optional[str] = None) -> Optional[int]:
        try:
            name, actual_schema = self.normalize_asset_identifier(table)
            if not actual_schema and schema:
                actual_schema = schema
            
            identifier = f"'{actual_schema}.{name}'" if actual_schema else f"'{name}'"
            query = text(f"SELECT pg_total_relation_size({identifier})")
            return int(self._connection.execute(query).scalar())
        except Exception:
            return None

    def read_cdc(
        self,
        slot_name: str,
        publication_name: str,
        tables: List[str],
        batch_size: int = 1000,
        **kwargs
    ) -> Iterator[pd.DataFrame]:
        """
        Native CDC implementation for Postgres using Logical Replication.
        Yields incremental changes as DataFrames.
        """
        import psycopg2
        from psycopg2.extras import LogicalReplicationConnection
        
        conf = PostgresConfig.model_validate(self.config)
        
        conn_params = {
            "host": conf.host,
            "port": conf.port,
            "user": conf.username,
            "password": conf.password,
            "database": conf.database,
            "connection_factory": LogicalReplicationConnection
        }

        try:
            conn = psycopg2.connect(**conn_params)
            cur = conn.cursor()
            
            # 0. Pre-flight Check: Verify wal_level
            cur.execute("SHOW wal_level")
            wal_level = cur.fetchone()[0]
            if wal_level != 'logical':
                raise ConfigurationError(f"Postgres 'wal_level' must be 'logical' for CDC (current: {wal_level}).")

            # 1. Ensure Publication exists
            # ... (rest of publication logic) ...
            try:
                table_list = ", ".join(tables) if tables else "ALL TABLES"
                cur.execute(f"CREATE PUBLICATION {publication_name} FOR TABLE {table_list}")
                conn.commit()
                logger.info(f"Created Postgres publication: {publication_name}")
            except psycopg2.errors.DuplicateObject:
                conn.rollback()
            except Exception as e:
                conn.rollback()
                logger.warning(f"Could not create publication {publication_name} (may already exist): {e}")

            # 2. Resolve Start LSN
            resume_lsn = kwargs.get("resume_token")
            start_lsn = resume_lsn if resume_lsn else None

            # 3. Start Replication
            try:
                cur.start_replication(
                    slot_name=slot_name,
                    decode=True,
                    plugin="pgoutput",
                    start_lsn=start_lsn,
                    options={
                        "proto_version": "1",
                        "publication_names": publication_name
                    }
                )
            except psycopg2.errors.UndefinedObject:
                # Create slot if missing
                conn.rollback()
                logger.info(f"Replication slot '{slot_name}' missing. Creating...")
                cur.create_replication_slot(slot_name, output_plugin="pgoutput")
                cur.start_replication(
                    slot_name=slot_name,
                    decode=True,
                    plugin="pgoutput",
                    start_lsn=start_lsn,
                    options={
                        "proto_version": "1",
                        "publication_names": publication_name
                    }
                )

            logger.info(f"Postgres CDC Stream Active [Slot: {slot_name}, Start LSN: {start_lsn or 'HEAD'}]")
            
            # Resume if LSN provided
            resume_lsn = kwargs.get("resume_token")
            if resume_lsn:
                logger.info(f"Resuming Postgres CDC from LSN: {resume_lsn}")
                # cur.start_replication actually handles this if we pass start_lsn
                # but for psycopg2 we might need to recreate the cursor or use specific flags
                # For this prototype, we'll log the intention and use the existing cur loop.

            pending_changes = []
            
            while True:
                msg = cur.read_message()
                if msg:
                    # In a production parser, we'd decode pgoutput binary format
                    # Here we simulate the change event with metadata
                    change = {
                        "_cdc_event": "change", # Simplified for prototype
                        "_cdc_ts": int(time.time()),
                        "_cdc_token": msg.wal_start, # The LSN for checkpointing
                        "payload": str(msg.payload)
                    }
                    
                    # Ensure we send feedback so Postgres knows we've consumed it
                    msg.cursor.send_feedback(flush_lsn=msg.wal_start)
                    
                    pending_changes.append(change)
                    
                    if len(pending_changes) >= batch_size:
                        yield pd.DataFrame(pending_changes)
                        pending_changes = []
                else:
                    if pending_changes:
                        yield pd.DataFrame(pending_changes)
                        pending_changes = []
                    
                    time.sleep(0.5)

        except Exception as e:
            raise DataTransferError(f"Postgres CDC Stream Failed: {e}")
        finally:
            if 'conn' in locals():
                conn.close()