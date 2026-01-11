import posixpath
import io
from typing import Any, Dict, Iterator, List, Optional, Union
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError, ConnectionFailedError, SchemaDiscoveryError, DataTransferError
from synqx_core.logging import get_logger

try:
    from azure.storage.blob import BlobServiceClient
except ImportError:
    BlobServiceClient = None

logger = get_logger(__name__)

class AzureBlobConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    connection_string: Optional[str] = Field(None, description="Azure Storage Connection String")
    account_name: Optional[str] = Field(None, description="Storage Account Name")
    account_key: Optional[str] = Field(None, description="Storage Account Key")
    container_name: str = Field(..., description="Container Name")
    recursive: bool = Field(True, description="Recursively search for files")
    max_depth: Optional[int] = Field(None, ge=0, description="Maximum depth for recursion")
    exclude_patterns: Optional[str] = Field(None, description="Comma-separated list of folders/files to exclude")

class AzureBlobConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if BlobServiceClient is None:
            raise ConfigurationError("Azure Storage Blob client not installed. Run 'pip install azure-storage-blob'.")
        
        self._config_model: Optional[AzureBlobConfig] = None
        self._service_client: Optional[BlobServiceClient] = None
        self._container_client = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = AzureBlobConfig.model_validate(self.config)
            if not self._config_model.connection_string and not (self._config_model.account_name and self._config_model.account_key):
                raise ConfigurationError("Either connection_string OR (account_name and account_key) must be provided.")
        except Exception as e:
            raise ConfigurationError(f"Invalid Azure Blob configuration: {e}")

    def connect(self) -> None:
        if self._service_client:
            return
        
        try:
            if self._config_model.connection_string:
                self._service_client = BlobServiceClient.from_connection_string(self._config_model.connection_string)
            else:
                self._service_client = BlobServiceClient(
                    account_url=f"https://{self._config_model.account_name}.blob.core.windows.net",
                    credential=self._config_model.account_key
                )
            
            self._container_client = self._service_client.get_container_client(self._config_model.container_name)
            if not self._container_client.exists():
                raise ConnectionFailedError(f"Container '{self._config_model.container_name}' does not exist.")
                
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to Azure Blob Storage: {e}")

    def disconnect(self) -> None:
        if self._service_client:
            self._service_client.close()
            self._service_client = None
            self._container_client = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                return True
        except Exception:
            return False

    def discover_assets(
        self,
        pattern: Optional[str] = None,
        include_metadata: bool = False,
        **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        assets = []
        prefix = kwargs.get("prefix")
        blobs = self._container_client.list_blobs(name_starts_with=prefix)
        
        valid_extensions = {'.csv', '.tsv', '.txt', '.xml', '.json', '.parquet', '.jsonl', '.avro', '.xls', '.xlsx'}
        is_recursive = self._config_model.recursive
        max_depth = self._config_model.max_depth
        max_assets = 10000

        ignored = {'.git', 'node_modules', '__pycache__', '.venv', 'venv'}
        if self._config_model.exclude_patterns:
            ignored.update({p.strip() for p in self._config_model.exclude_patterns.split(',') if p.strip()})

        for blob in blobs:
            if len(assets) >= max_assets:
                logger.warning(f"Reached max discovery limit of {max_assets} assets for container {self._config_model.container_name}")
                break

            rel_name = blob.name[len(prefix):] if prefix else blob.name
            depth = len(rel_name.lstrip('/').split('/')) - 1
            if max_depth is not None and depth > max_depth:
                continue

            if pattern and pattern not in blob.name:
                continue
            
            if any(ig in blob.name for ig in ignored):
                continue

            if not is_recursive:
                rel_path = blob.name[len(prefix):] if prefix else blob.name
                if "/" in rel_path.lstrip("/"):
                    continue

            ext = posixpath.splitext(blob.name)[1].lower()
            if ext in valid_extensions:
                asset = {
                    "name": blob.name,
                    "fully_qualified_name": f"{self._config_model.container_name}/{blob.name}",
                    "type": "file",
                    "format": ext.replace(".", "")
                }
                if include_metadata:
                    asset["metadata"] = {
                        "size": blob.size,
                        "updated": blob.last_modified.isoformat() if blob.last_modified else None,
                        "content_type": blob.content_settings.content_type
                    }
                assets.append(asset)
        return assets

    def infer_schema(self, asset: str, sample_size: int = 1000, **kwargs) -> Dict[str, Any]:
        self.connect()
        try:
            df_iter = self.read_batch(asset, limit=sample_size)
            df = next(df_iter)
            
            columns = []
            for col, dtype in df.dtypes.items():
                col_type = "string"
                dtype_str = str(dtype).lower()
                
                if "int" in dtype_str:
                    col_type = "integer"
                elif "float" in dtype_str or "double" in dtype_str:
                    col_type = "float"
                elif "bool" in dtype_str:
                    col_type = "boolean"
                elif "datetime" in dtype_str:
                    col_type = "datetime"
                elif "object" in dtype_str:
                    first_val = df[col].dropna().iloc[0] if not df[col].dropna().empty else None
                    if isinstance(first_val, (dict, list)):
                        col_type = "json"
                
                columns.append({
                    "name": col,
                    "type": col_type,
                    "native_type": str(dtype)
                })

            return {
                "asset": asset,
                "columns": columns,
                "format": asset.split('.')[-1].lower() if '.' in asset else 'unknown',
                "row_count_estimate": len(df)
            }
        except Exception as e:
            logger.error(f"Schema inference failed for Azure Blob {asset}: {e}")
            raise SchemaDiscoveryError(f"Azure Blob schema inference failed for {asset}: {e}")

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        blob_client = self._container_client.get_blob_client(asset)
        download_stream = blob_client.download_blob()
        data = download_stream.readall()
        bio = io.BytesIO(data)
        
        ext = posixpath.splitext(asset)[1].lower()
        chunksize = kwargs.get("chunksize", 10000)
        
        if ext == ".csv":
            reader = pd.read_csv(bio, chunksize=chunksize)
            rows = 0
            for df in reader:
                if limit is not None:
                    remaining = limit - rows
                    if remaining <= 0:
                        break
                    if len(df) > remaining:
                        df = df.iloc[:int(remaining)]
                yield df
                rows += len(df)
                if limit is not None and rows >= limit:
                    break
        
        elif ext == ".tsv":
            reader = pd.read_csv(bio, sep='\t', chunksize=chunksize)
            rows = 0
            for df in reader:
                if limit is not None:
                    remaining = limit - rows
                    if remaining <= 0:
                        break
                    if len(df) > remaining:
                        df = df.iloc[:int(remaining)]
                yield df
                rows += len(df)
                if limit is not None and rows >= limit:
                    break

        elif ext == ".txt":
            reader = pd.read_csv(bio, sep='\n', header=None, names=['line'], chunksize=chunksize)
            rows = 0
            for df in reader:
                if limit is not None:
                    remaining = limit - rows
                    if remaining <= 0:
                        break
                    if len(df) > remaining:
                        df = df.iloc[:int(remaining)]
                yield df
                rows += len(df)
                if limit is not None and rows >= limit:
                    break

        elif ext == ".xml":
            df = pd.read_xml(bio)
            df = self.slice_dataframe(df, offset, limit)
            yield df

        elif ext in (".xls", ".xlsx"):
            df = pd.read_excel(bio)
            df = self.slice_dataframe(df, offset, limit)
            yield df

        elif ext == ".parquet":
            df = pd.read_parquet(bio)
            df = self.slice_dataframe(df, offset, limit)
            yield df
            
        elif ext == ".jsonl":
            reader = pd.read_json(bio, lines=True, chunksize=chunksize)
            rows = 0
            for df in reader:
                if limit is not None:
                    remaining = limit - rows
                    if remaining <= 0:
                        break
                    if len(df) > remaining:
                        df = df.iloc[:int(remaining)]
                yield df
                rows += len(df)
                if limit is not None and rows >= limit:
                    break
        
        elif ext == ".json":
            df = pd.read_json(bio)
            df = self.slice_dataframe(df, offset, limit)
            yield df

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        blob_client = self._container_client.get_blob_client(asset)
        
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.concat(list(data))
            
        ext = posixpath.splitext(asset)[1].lower()
        bio = io.BytesIO()
        
        if ext == ".csv":
            df.to_csv(bio, index=False)
        elif ext == ".parquet":
            df.to_parquet(bio, index=False)
        elif ext == ".json":
            df.to_json(bio, orient="records")
        elif ext == ".jsonl":
            df.to_json(bio, orient="records", lines=True)
        
        bio.seek(0)
        blob_client.upload_blob(bio, overwrite=True)
        return len(df)

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError("Query execution is not supported for Azure Blob connector.")

    # --- Live File Management Implementation ---

    def list_files(self, path: str = "") -> List[Dict[str, Any]]:
        self.connect()
        prefix = path.lstrip('/')
        if prefix and not prefix.endswith('/'):
            prefix += '/'
            
        try:
            # list_blobs with name_starts_with and delimiter to emulate directories
            blobs = self._container_client.list_blobs(name_starts_with=prefix)
            results = []
            seen_dirs = set()
            
            for blob in blobs:
                # Get the relative name within the current "directory"
                rel_name = blob.name[len(prefix):]
                if not rel_name:
                    continue
                
                parts = rel_name.split('/')
                if len(parts) > 1:
                    # It's in a subdirectory
                    dir_name = parts[0]
                    if dir_name not in seen_dirs:
                        results.append({
                            "name": dir_name,
                            "path": prefix + dir_name,
                            "type": "directory",
                            "size": 0,
                            "modified_at": None
                        })
                        seen_dirs.add(dir_name)
                else:
                    # It's a file in the current directory
                    results.append({
                        "name": parts[0],
                        "path": blob.name,
                        "type": "file",
                        "size": blob.size,
                        "modified_at": blob.last_modified.timestamp() if blob.last_modified else None
                    })
            return results
        except Exception as e:
            logger.error(f"Azure list_files failed for {path}: {e}")
            raise DataTransferError(f"Failed to list Azure blobs: {e}")

    def download_file(self, path: str) -> bytes:
        self.connect()
        try:
            blob_client = self._container_client.get_blob_client(path)
            return blob_client.download_blob().readall()
        except Exception as e:
            logger.error(f"Azure download failed for {path}: {e}")
            raise DataTransferError(f"Failed to download Azure blob: {e}")

    def upload_file(self, path: str, content: bytes) -> bool:
        self.connect()
        try:
            blob_client = self._container_client.get_blob_client(path)
            blob_client.upload_blob(content, overwrite=True)
            return True
        except Exception as e:
            logger.error(f"Azure upload failed to {path}: {e}")
            raise DataTransferError(f"Failed to upload Azure blob: {e}")

    def delete_file(self, path: str) -> bool:
        self.connect()
        try:
            # Check if it's a "directory" by listing with prefix
            blobs = list(self._container_client.list_blobs(name_starts_with=path))
            if len(blobs) > 1 or (len(blobs) == 1 and blobs[0].name != path):
                # Delete all blobs with this prefix
                for blob in blobs:
                    self._container_client.delete_blob(blob.name)
            else:
                # Delete single blob
                self._container_client.delete_blob(path)
            return True
        except Exception as e:
            logger.error(f"Azure delete failed for {path}: {e}")
            raise DataTransferError(f"Failed to delete Azure blob: {e}")

    def create_directory(self, path: str) -> bool:
        self.connect()
        # Azure is flat, create a zero-byte placeholder ending in /
        try:
            blob_client = self._container_client.get_blob_client(path.rstrip('/') + '/')
            blob_client.upload_blob(b'', overwrite=True)
            return True
        except Exception as e:
            logger.error(f"Azure mkdir failed for {path}: {e}")
            raise DataTransferError(f"Failed to create Azure placeholder: {e}")
