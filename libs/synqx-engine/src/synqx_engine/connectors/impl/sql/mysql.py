import logging
import pandas as pd
import time
from typing import Iterator
from synqx_engine.connectors.impl.sql.base import SQLConnector
from synqx_engine.connectors.impl.sql.postgres import PostgresConfig
from synqx_core.errors import ConfigurationError, DataTransferError
from pydantic import Field

logger = logging.getLogger(__name__)

class MySQLConfig(PostgresConfig):
    port: int = 3306
    server_id: int = Field(999, description="Unique MySQL replication server ID")

class MySQLConnector(SQLConnector):
    """
    Robust MySQL Connector with Native Binlog-based CDC.
    """

    def validate_config(self) -> None:
        try:
            MySQLConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid MySQL configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = MySQLConfig.model_validate(self.config)
        return (
            f"mysql+pymysql://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )

    def read_cdc(
        self,
        batch_size: int = 1000,
        **kwargs
    ) -> Iterator[pd.DataFrame]:
        """
        MySQL CDC implementation using Binlog Tailing.
        """
        from pymysqlreplication import BinLogStreamReader
        from pymysqlreplication.row_event import (
            DeleteRowsEvent, UpdateRowsEvent, WriteRowsEvent
        )
        
        conf = MySQLConfig.model_validate(self.config)
        
        # Connect settings for pymysql
        mysql_settings = {
            "host": conf.host,
            "port": conf.port,
            "user": conf.username,
            "passwd": conf.password
        }

        # Retrieve starting position from watermark if provided in kwargs
        resume_pos = kwargs.get("resume_token") # e.g. {"file": "mysql-bin.000001", "pos": 123}
        
        log_file = resume_pos.get("file") if resume_pos else None
        log_pos = resume_pos.get("pos") if resume_pos else None

        stream = BinLogStreamReader(
            connection_settings=mysql_settings,
            server_id=conf.server_id,
            only_schemas=[conf.database],
            only_tables=kwargs.get("tables"),
            resume_stream=True if log_file else False,
            log_file=log_file,
            log_pos=log_pos,
            only_events=[DeleteRowsEvent, WriteRowsEvent, UpdateRowsEvent],
            blocking=True,
            every_checkpoint=True
        )

        try:
            logger.info(f"MySQL Binlog Stream Active [Resume: {log_file}:{log_pos if log_pos else 'START'}]")
            pending_changes = []

            for binlogevent in stream:
                for row in binlogevent.rows:
                    event_type = "unknown"
                    if isinstance(binlogevent, WriteRowsEvent):
                        event_type = "insert"
                        vals = row["values"]
                    elif isinstance(binlogevent, UpdateRowsEvent):
                        event_type = "update"
                        vals = row["after_values"]
                    elif isinstance(binlogevent, DeleteRowsEvent):
                        event_type = "delete"
                        vals = row["values"]

                    change = {
                        "_cdc_event": event_type,
                        "_cdc_ts": binlogevent.timestamp,
                        "_cdc_token": {
                            "file": stream.log_file,
                            "pos": stream.log_pos
                        },
                        **vals
                    }
                    pending_changes.append(change)

                    if len(pending_changes) >= batch_size:
                        yield pd.DataFrame(pending_changes)
                        pending_changes = []

                # Heartbeat check
                if not binlogevent:
                    if pending_changes:
                        yield pd.DataFrame(pending_changes)
                        pending_changes = []
                    time.sleep(0.1)

        except Exception as e:
            raise DataTransferError(f"MySQL CDC Stream Failed: {e}")
        finally:
            stream.close()