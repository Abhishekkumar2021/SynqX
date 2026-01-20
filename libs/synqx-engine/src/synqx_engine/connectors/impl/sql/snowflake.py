import uuid
from collections.abc import Iterator
from typing import Any

import pandas as pd
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text
from synqx_core.errors import ConfigurationError, DataTransferError
from synqx_core.logging import get_logger

from synqx_engine.connectors.impl.sql.base import SQLConnector

logger = get_logger(__name__)


class SnowflakeConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    user: str = Field(..., description="Snowflake User")
    password: str = Field(..., description="Snowflake Password")
    account: str = Field(..., description="Snowflake Account (e.g. xy12345.us-east-1)")
    warehouse: str = Field(..., description="Warehouse")
    database: str = Field(..., description="Database")
    schema_name: str = Field("PUBLIC", alias="schema", description="Schema")
    role: str | None = Field(None, description="Role")


class SnowflakeConnector(SQLConnector):
    """
    Robust Snowflake Connector using SQLAlchemy.
    Supports high-performance staging via S3.
    """

    def validate_config(self) -> None:
        try:
            SnowflakeConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Snowflake configuration: {e}")  # noqa: B904

    def _sqlalchemy_url(self) -> str:
        conf = SnowflakeConfig.model_validate(self.config)
        url = (
            f"snowflake://{conf.user}:{conf.password}"
            f"@{conf.account}/{conf.database}/{conf.schema_name}"
            f"?warehouse={conf.warehouse}"
        )
        if conf.role:
            url += f"&role={conf.role}"
        return url

    def supports_staging(self) -> bool:
        return True

    def write_staged(
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
        asset: str,
        stage_connector: Any,
        mode: str = "append",
        **kwargs,
    ) -> int:
        """
        Snowflake-specific high-performance load.
        Currently supports S3 staging.
        """
        from synqx_engine.connectors.impl.files.s3 import S3Connector  # noqa: PLC0415

        if not isinstance(stage_connector, S3Connector):
            logger.warning(
                f"Snowflake staged write requested with non-S3 connector ({type(stage_connector)}). Falling back to direct insert."  # noqa: E501
            )
            return self.write_batch(data, asset, mode=mode, **kwargs)

        self.connect()
        name, schema = self.normalize_asset_identifier(asset)
        table_ref = f'"{schema}"."{name}"' if schema else f'"{name}"'

        # 1. Generate unique staging path
        session_id = str(uuid.uuid4())[:8]
        stage_filename = f"synqx_stage_{asset}_{session_id}.parquet"

        try:
            # 2. Upload to S3 as Parquet
            # We use parquet for better type preservation and performance
            rows_written = stage_connector.write_batch(
                data, stage_filename, mode="replace", format="parquet"
            )

            if rows_written == 0:
                return 0

            # 3. Trigger Snowflake COPY INTO
            s3_conf = stage_connector._config_model
            s3_path = f"s3://{s3_conf.bucket}/{stage_filename}"

            # Handle Overwrite mode
            if mode.lower() in ("replace", "overwrite"):
                self._connection.execute(text(f"TRUNCATE TABLE {table_ref}"))

            # Snowflake native COPY command for Parquet
            # Note: This assumes the table already exists with matching column names
            # or Snowflake's infer_schema logic is used.
            # For now, we assume simple column mapping.
            copy_stmt = f"""
                COPY INTO {table_ref}
                FROM '{s3_path}'
                CREDENTIALS = (
                    AWS_KEY_ID = '{s3_conf.aws_access_key_id}' 
                    AWS_SECRET_KEY = '{s3_conf.aws_secret_access_key}'
                )
                FILE_FORMAT = (TYPE = 'PARQUET')
                MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
                PURGE = TRUE;
            """

            logger.info(f"Triggering Snowflake COPY for {asset} from {s3_path}")
            self._connection.execute(text(copy_stmt))
            self._connection.execute(text("COMMIT"))

            return rows_written

        except Exception as e:
            logger.error(f"Snowflake staged load failed: {e}")
            raise DataTransferError(f"Snowflake staged load failed: {e}")  # noqa: B904
        finally:
            # Cleanup staging file if PURGE=FALSE or if failure happened before purge
            try:
                stage_connector.delete_file(stage_filename)
            except Exception:
                pass
