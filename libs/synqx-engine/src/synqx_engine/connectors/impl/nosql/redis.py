from collections.abc import Iterator
from typing import Any

import pandas as pd
import redis
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from synqx_core.errors import (
    ConfigurationError,
    ConnectionFailedError,
    DataTransferError,
)
from synqx_core.logging import get_logger
from synqx_core.utils.data import is_df_empty

from synqx_engine.connectors.base import BaseConnector

logger = get_logger(__name__)


class RedisConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    host: str = Field("localhost", description="Redis Host")
    port: int = Field(6379, description="Redis Port")
    password: str | None = Field(None, description="Redis Password")
    db: int = Field(0, description="Redis DB Index")
    decode_responses: bool = Field(True, description="Decode responses to strings")


class RedisConnector(BaseConnector):
    def __init__(self, config: dict[str, Any]):
        self._config_model: RedisConfig | None = None
        self._client: redis.Redis | None = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = RedisConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Redis configuration: {e}")  # noqa: B904

    def connect(self) -> None:
        if self._client:
            return
        try:
            self._client = redis.Redis(
                host=self._config_model.host,
                port=self._config_model.port,
                password=self._config_model.password,
                db=self._config_model.db,
                decode_responses=self._config_model.decode_responses,
            )
            self._client.ping()
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to Redis: {e}")  # noqa: B904

    def disconnect(self) -> None:
        if self._client:
            self._client.close()
            self._client = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: str | None = None, include_metadata: bool = False, **kwargs
    ) -> list[dict[str, Any]]:
        self.connect()
        # Redis is K-V, no real "tables". We can treat keyspaces or patterns as assets.
        # Standardize name and fully_qualified_name.
        return [
            {
                "name": pattern or "all_keys",
                "fully_qualified_name": pattern or "*",
                "type": "key_pattern",
            }
        ]

    def infer_schema(self, asset: str, **kwargs) -> dict[str, Any]:
        return {
            "asset": asset,
            "columns": [
                {"name": "key", "type": "string"},
                {"name": "value", "type": "string"},
            ],
            "type": "kv",
        }

    def read_batch(  # noqa: PLR0912
        self,
        asset: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        pattern = asset if asset != "*" else "*"
        incremental_filter = kwargs.get("incremental_filter")

        count = limit if limit else 1000

        keys_batch = []
        rows_yielded = 0

        for key in self._client.scan_iter(match=pattern, count=count):
            keys_batch.append(key)
            if len(keys_batch) >= count:
                values = self._client.mget(keys_batch)
                df = pd.DataFrame({"key": keys_batch, "value": values})

                # Apply Incremental Filter
                if incremental_filter and isinstance(incremental_filter, dict):
                    for col, val in incremental_filter.items():
                        if col in df.columns:
                            df = df[df[col] > val]

                if not is_df_empty(df):
                    # Apply limit if needed (simplistic)
                    if limit:
                        remaining = limit - rows_yielded
                        if remaining <= 0:
                            break
                        if len(df) > remaining:
                            df = df.iloc[:remaining]

                    rows_yielded += len(df)
                    yield df

                keys_batch = []
                if limit and rows_yielded >= limit:
                    break

        if keys_batch:
            values = self._client.mget(keys_batch)
            df = pd.DataFrame({"key": keys_batch, "value": values})

            # Apply Incremental Filter
            if incremental_filter and isinstance(incremental_filter, dict):
                for col, val in incremental_filter.items():
                    if col in df.columns:
                        df = df[df[col] > val]

            if not is_df_empty(df):
                if limit and limit - rows_yielded < len(df):
                    df = df.iloc[: limit - rows_yielded]
                yield df

    def write_batch(
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
        asset: str,  # unused mostly, maybe prefix?
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        total = 0

        # Normalize mode
        clean_mode = mode.lower()
        if clean_mode == "replace":
            clean_mode = "overwrite"

        if clean_mode == "overwrite":
            # Warning: This clears the entire Redis database.
            # In a multi-tenant system, we might want to clear only keys matching a prefix.  # noqa: E501
            self._client.flushdb()
            logger.info("redis_db_flushed_for_overwrite")

        if clean_mode == "upsert":
            # Redis mset naturally behaves as an upsert (overwrites existing keys)
            pass

        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data

        for df in iterator:
            if "key" not in df.columns or "value" not in df.columns:
                continue  # Skip invalid

            # Use pipeline
            mapping = dict(zip(df["key"], df["value"]))  # noqa: B905
            if mapping:
                try:
                    self._client.mset(mapping)
                    total += len(mapping)
                except Exception as e:
                    raise DataTransferError(f"Redis write failed: {e}")  # noqa: B904
        return total

    def execute_query(
        self,
        query: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError(
            "Direct query execution is not supported for Redis connector. Use key patterns as assets."  # noqa: E501
        )
