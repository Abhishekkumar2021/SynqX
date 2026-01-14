import uuid
from typing import Any, Dict, Optional, Iterator, Union, List
import pandas as pd
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError, ConnectionFailedError, DataTransferError
from synqx_core.logging import get_logger
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from google.cloud import bigquery
from google.oauth2 import service_account

logger = get_logger(__name__)

class BigQueryConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    project_id: str = Field(..., description="GCP Project ID")
    dataset_id: str = Field(..., description="BigQuery Dataset ID")
    credentials_json: Optional[str] = Field(None, description="Service Account JSON Content")
    credentials_path: Optional[str] = Field(None, description="Path to Service Account JSON")

class BigQueryConnector(BaseConnector):
    """
    Robust BigQuery Connector using Google Cloud Python SDK.
    Supports high-performance staging via GCS.
    """
    def __init__(self, config: Dict[str, Any]):
        self._config_model: Optional[BigQueryConfig] = None
        self._client: Optional[bigquery.Client] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = BigQueryConfig.model_validate(self.config)
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
            self.connect()
            self._client.query("SELECT 1").result()
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
        if mode == "replace" or mode == "overwrite":
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

    def supports_staging(self) -> bool:
        return True

    def write_staged(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        stage_connector: Any,
        mode: str = "append",
        **kwargs,
    ) -> int:
        """
        BigQuery-specific high-performance load via GCS.
        """
        from synqx_engine.connectors.impl.files.gcs import GCSConnector
        
        if not isinstance(stage_connector, GCSConnector):
            logger.warning("BigQuery staged write requested with non-GCS connector. Falling back to direct load.")
            return self.write_batch(data, asset, mode=mode, **kwargs)

        self.connect()
        table_id = f"{self._config_model.project_id}.{self._config_model.dataset_id}.{asset}"
        
        # 1. Generate unique staging path
        session_id = str(uuid.uuid4())[:8]
        stage_filename = f"synqx_stage_{asset}_{session_id}.parquet"
        
        try:
            # 2. Upload to GCS as Parquet
            rows_written = stage_connector.write_batch(
                data, 
                stage_filename, 
                mode="replace"
            )
            
            if rows_written == 0:
                return 0

            # 3. Trigger BigQuery Load from GCS
            gcs_conf = stage_connector._config_model
            uri = f"gs://{gcs_conf.bucket}/{stage_filename}"
            
            job_config = bigquery.LoadJobConfig(
                source_format=bigquery.SourceFormat.PARQUET,
                write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE if mode.lower() in ("replace", "overwrite") 
                                  else bigquery.WriteDisposition.WRITE_APPEND,
            )

            logger.info(f"Triggering BigQuery Load for {asset} from {uri}")
            load_job = self._client.load_table_from_uri(uri, table_id, job_config=job_config)
            load_job.result() # Wait for completion
            
            return rows_written

        except Exception as e:
            logger.error(f"BigQuery staged load failed: {e}")
            raise DataTransferError(f"BigQuery staged load failed: {e}")
        finally:
            try:
                stage_connector.delete_file(stage_filename)
            except Exception:
                pass

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
