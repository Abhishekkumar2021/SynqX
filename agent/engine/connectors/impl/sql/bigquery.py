from typing import Any, Dict, Optional, Iterator, Union, List
import pandas as pd
from engine.connectors.base import BaseConnector
from engine.core.errors import ConfigurationError, ConnectionFailedError, DataTransferError
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from google.cloud import bigquery
from google.oauth2 import service_account

class BigQueryConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    project_id: str = Field(..., description="GCP Project ID")
    dataset_id: str = Field(..., description="BigQuery Dataset ID")
    credentials_json: Optional[str] = Field(None, description="Service Account JSON Content")
    credentials_path: Optional[str] = Field(None, description="Path to Service Account JSON")

class BigQueryConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        self._config_model: Optional[BigQueryConfig] = None
        self._client: Optional[bigquery.Client] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = BigQueryConfig.model_validate(self.config)
            if not self._config_model.credentials_json and not self._config_model.credentials_path:
                 # It might rely on default environment auth
                 pass
        except Exception as e:
            raise ConfigurationError(f"Invalid BigQuery config: {e}")

    def connect(self) -> None:
        if self._client:
            return
        try:
            if self._config_model.credentials_json:
                import json
                info = json.loads(self._config_model.credentials_json)
                creds = service_account.Credentials.from_service_account_info(info)
                self._client = bigquery.Client(project=self._config_model.project_id, credentials=creds)
            elif self._config_model.credentials_path:
                creds = service_account.Credentials.from_service_account_file(self._config_model.credentials_path)
                self._client = bigquery.Client(project=self._config_model.project_id, credentials=creds)
            else:
                self._client = bigquery.Client(project=self._config_model.project_id)
        except Exception as e:
            raise ConnectionFailedError(f"BigQuery connection failed: {e}")

    def disconnect(self) -> None:
        self._client = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                self._client.query("SELECT 1")
                return True
        except Exception:
            return False

    def discover_assets(self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs) -> List[Dict[str, Any]]:
        self.connect()
        dataset_ref = self._client.dataset(self._config_model.dataset_id)
        tables = self._client.list_tables(dataset_ref)
        
        assets = []
        for t in tables:
            name = t.table_id
            if pattern and pattern.lower() not in name.lower():
                continue
            assets.append({"name": name, "type": "table"})
        return assets

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        self.connect()
        table_ref = self._client.dataset(self._config_model.dataset_id).table(asset)
        table = self._client.get_table(table_ref)
        
        columns = [{"name": s.name, "type": s.field_type, "mode": s.mode} for s in table.schema]
        return {"asset": asset, "columns": columns, "schema": self._config_model.dataset_id}

    def read_batch(self, asset: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs) -> Iterator[pd.DataFrame]:
        self.connect()
        query = f"SELECT * FROM `{self._config_model.project_id}.{self._config_model.dataset_id}.{asset}`"
        
        incremental_filter = kwargs.get("incremental_filter")
        if incremental_filter and isinstance(incremental_filter, dict):
            where_clauses = []
            for col, val in incremental_filter.items():
                if isinstance(val, (int, float)):
                    where_clauses.append(f"{col} > {val}")
                else:
                    where_clauses.append(f"{col} > '{val}'")
            
            if where_clauses:
                query += f" WHERE {' AND '.join(where_clauses)}"

        if limit:
            query += f" LIMIT {limit}"
        if offset:
            query += f" OFFSET {offset}"
            
        try:
            df = self._client.query(query).to_dataframe()
            yield df
        except Exception as e:
            raise DataTransferError(f"BigQuery read failed: {e}")

    def write_batch(self, data: Union[pd.DataFrame, Iterator[pd.DataFrame]], asset: str, mode: str = "append", **kwargs) -> int:
        self.connect()
        table_id = f"{self._config_model.project_id}.{self._config_model.dataset_id}.{asset}"
        
        job_config = bigquery.LoadJobConfig()
        if mode == "replace":
            job_config.write_disposition = bigquery.WriteDisposition.WRITE_TRUNCATE
        else:
            job_config.write_disposition = bigquery.WriteDisposition.WRITE_APPEND
            
        total = 0
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        for df in iterator:
            job = self._client.load_table_from_dataframe(df, table_id, job_config=job_config)
            job.result()
            total += len(df)
            
        return total

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            clean_query = query.strip().rstrip(';')
            final_query = clean_query
            if limit and "limit" not in clean_query.lower():
                final_query += f" LIMIT {limit}"
            if offset and "offset" not in clean_query.lower():
                final_query += f" OFFSET {offset}"
            
            df = self._client.query(final_query).to_dataframe()
            return df.where(pd.notnull(df), None).to_dict(orient="records")
        except Exception as e:
            raise DataTransferError(f"BigQuery query execution failed: {e}")
