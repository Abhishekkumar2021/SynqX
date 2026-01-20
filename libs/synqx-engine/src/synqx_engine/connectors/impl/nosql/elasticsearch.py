from collections.abc import Iterator
from typing import Any

import pandas as pd
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from synqx_core.errors import (
    ConfigurationError,
    ConnectionFailedError,
    DataTransferError,
)
from synqx_core.logging import get_logger

from synqx_engine.connectors.base import BaseConnector

try:
    from elasticsearch import Elasticsearch
    from elasticsearch.helpers import bulk, scan
except ImportError:
    Elasticsearch = None
    scan = None
    bulk = None

logger = get_logger(__name__)


class ElasticsearchConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    hosts: list[str] = Field(
        ["http://localhost:9200"], description="Elasticsearch Hosts"
    )
    api_key: str | None = Field(None, description="API Key")
    username: str | None = Field(None, description="Username")
    password: str | None = Field(None, description="Password")
    verify_certs: bool = Field(True, description="Verify SSL certificates")
    ca_certs: str | None = Field(None, description="Path to CA bundle")


class ElasticsearchConnector(BaseConnector):
    def __init__(self, config: dict[str, Any]):
        if Elasticsearch is None:
            raise ConfigurationError(
                "Elasticsearch client not installed. Run 'pip install elasticsearch'."
            )

        self._config_model: ElasticsearchConfig | None = None
        self._client: Elasticsearch | None = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            # Handle hosts string vs list
            if isinstance(self.config.get("hosts"), str):
                self.config["hosts"] = [
                    h.strip() for h in self.config["hosts"].split(",")
                ]

            self._config_model = ElasticsearchConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Elasticsearch configuration: {e}")  # noqa: B904

    def connect(self) -> None:
        if self._client:
            return

        auth = None
        if self._config_model.username and self._config_model.password:
            auth = (self._config_model.username, self._config_model.password)

        try:
            self._client = Elasticsearch(
                hosts=self._config_model.hosts,
                api_key=self._config_model.api_key,
                basic_auth=auth,
                verify_certs=self._config_model.verify_certs,
                ca_certs=self._config_model.ca_certs,
            )
            if not self._client.ping():
                raise ConnectionFailedError("Elasticsearch ping failed.")
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to Elasticsearch: {e}")  # noqa: B904

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
        indices = self._client.cat.indices(format="json")

        assets = []
        for idx in indices:
            name = idx["index"]
            if pattern and pattern not in name:
                continue

            asset = {"name": name, "fully_qualified_name": name, "type": "index"}
            if include_metadata:
                asset["metadata"] = {
                    "docs_count": idx.get("docs.count"),
                    "store_size": idx.get("store.size"),
                    "status": idx.get("status"),
                }
            assets.append(asset)
        return assets

    def infer_schema(self, asset: str, **kwargs) -> dict[str, Any]:
        self.connect()
        try:
            mapping = self._client.indices.get_mapping(index=asset)
            properties = mapping[asset]["mappings"].get("properties", {})

            columns = []
            for field_name, field_info in properties.items():
                es_type = field_info.get("type", "object")
                # Map ES types to basic SynqX types
                col_type = "string"
                if es_type in ["integer", "long", "short"]:
                    col_type = "integer"
                elif es_type in ["float", "double", "half_float"]:
                    col_type = "float"
                elif es_type == "boolean":
                    col_type = "boolean"
                elif es_type == "date":
                    col_type = "datetime"

                columns.append(
                    {"name": field_name, "type": col_type, "native_type": es_type}
                )

            return {"asset": asset, "columns": columns, "type": "document"}
        except Exception as e:
            logger.error(f"Schema inference failed for {asset}: {e}")
            return {"asset": asset, "columns": [], "type": "document"}

    def read_batch(
        self,
        asset: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        query = kwargs.get("query") or {"query": {"match_all": {}}}

        # ES scan doesn't support offset directly, but we can skip if needed
        # For simplicity, we use helpers.scan which is efficient for large indices
        rows_yielded = 0
        batch_size = kwargs.get("batch_size", 1000)
        current_batch = []

        # If offset is provided, we skip (expensive but sometimes needed)
        # Note: better to use ES PIT or search_after for real pagination

        for hit in scan(self._client, index=asset, query=query):
            doc = hit["_source"]
            doc["_id"] = hit["_id"]  # Include ES ID
            current_batch.append(doc)

            if len(current_batch) >= batch_size:
                df = pd.DataFrame(current_batch)
                if limit and rows_yielded + len(df) > limit:
                    df = df.iloc[: limit - rows_yielded]

                rows_yielded += len(df)
                yield df
                current_batch = []

                if limit and rows_yielded >= limit:
                    break

        if current_batch and (not limit or rows_yielded < limit):
            df = pd.DataFrame(current_batch)
            if limit and rows_yielded + len(df) > limit:
                df = df.iloc[: limit - rows_yielded]
            yield df

    def write_batch(
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()

        if mode.lower() == "overwrite":
            if self._client.indices.exists(index=asset):
                self._client.indices.delete(index=asset)
            self._client.indices.create(index=asset)

        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data

        total = 0
        for df in iterator:
            actions = []
            for _, row in df.iterrows():
                doc = row.to_dict()
                # Handle ES ID if present in dataframe
                doc_id = doc.pop("_id", None)
                action = {"_index": asset, "_source": doc}
                if doc_id:
                    action["_id"] = doc_id
                actions.append(action)

            if actions:
                success, failed = bulk(self._client, actions)
                total += success
                if failed:
                    logger.warning(
                        f"Elasticsearch bulk write had {len(failed)} failures"
                    )

        return total

    def execute_query(
        self,
        query: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> list[dict[str, Any]]:
        self.connect()
        # Expecting query to be a JSON string or dict
        import json  # noqa: PLC0415

        try:
            if isinstance(query, str):
                body = json.loads(query)
            else:
                body = query

            res = self._client.search(
                index=kwargs.get("index", "*"),
                body=body,
                size=limit or 100,
                from_=offset or 0,
            )
            return [hit["_source"] for hit in res["hits"]["hits"]]
        except Exception as e:
            raise DataTransferError(f"Elasticsearch query failed: {e}")  # noqa: B904
