import posixpath
from datetime import datetime
from typing import Any, Dict, Iterator, List, Optional, Union
import pandas as pd
import s3fs
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from engine.connectors.base import BaseConnector
from engine.core.errors import ConfigurationError, DataTransferError, SchemaDiscoveryError, ConnectionFailedError
from engine.core.logging import get_logger

logger = get_logger(__name__)

class S3Config(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    bucket: str = Field(..., description="S3 Bucket Name")
    region_name: str = Field("us-east-1", description="AWS Region")
    aws_access_key_id: Optional[str] = Field(None, description="AWS Access Key ID")
    aws_secret_access_key: Optional[str] = Field(None, description="AWS Secret Access Key")
    endpoint_url: Optional[str] = Field(None, description="Custom Endpoint URL (e.g. for MinIO)")
    recursive: bool = Field(True, description="Recursively search for files")
    max_depth: Optional[int] = Field(None, ge=0, description="Maximum depth for recursion")
    exclude_patterns: Optional[str] = Field(None, description="Comma-separated list of folders/files to exclude")

class S3Connector(BaseConnector):
    """
    Robust Connector for Amazon S3 (and compatible storages like MinIO).
    """

    def __init__(self, config: Dict[str, Any]):
        self._config_model: Optional[S3Config] = None
        self._fs: Optional[s3fs.S3FileSystem] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = S3Config.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid S3 configuration: {e}")

    def connect(self) -> None:
        if self._fs:
            return
        
        try:
            client_kwargs = {}
            if self._config_model.endpoint_url:
                client_kwargs['endpoint_url'] = self._config_model.endpoint_url

            self._fs = s3fs.S3FileSystem(
                key=self._config_model.aws_access_key_id,
                secret=self._config_model.aws_secret_access_key,
                client_kwargs=client_kwargs,
                config_kwargs={'retries': {'max_attempts': 5}}
            )
            # Verify bucket accessibility
            if not self._fs.exists(self._config_model.bucket):
                raise ConnectionFailedError(f"Bucket '{self._config_model.bucket}' not found or inaccessible.")
                
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to S3: {e}")

    def disconnect(self) -> None:
        self._fs = None

    def test_connection(self) -> bool:
        try:
            self.connect()
            self._fs.ls(self._config_model.bucket, detail=False)
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            is_recursive = self._config_model.recursive
            max_depth = self._config_model.max_depth

            # Recursive listing with optimized filter
            glob_pattern = f"{self._config_model.bucket}/**" if is_recursive else f"{self._config_model.bucket}/*"
            files = self._fs.glob(glob_pattern)
            valid_extensions = ('.csv', '.tsv', '.txt', '.xml', '.parquet', '.json', '.jsonl', '.avro', '.xls', '.xlsx')
            
            ignored = {'.git', 'node_modules', '__pycache__', '.venv', 'venv'}
            if self._config_model.exclude_patterns:
                ignored.update({p.strip() for p in self._config_model.exclude_patterns.split(',') if p.strip()})

            assets = []
            max_assets = 10000

            for f in files:
                if len(assets) >= max_assets:
                    logger.warning(f"Reached max discovery limit of {max_assets} assets for bucket {self._config_model.bucket}")
                    break

                if f.lower().endswith(valid_extensions):
                    rel_path = f.replace(f"{self._config_model.bucket}/", "")
                    
                    # Depth check
                    if max_depth is not None:
                        # count '/' in rel_path to determine depth
                        depth = len(rel_path.split('/')) - 1
                        if depth > max_depth:
                            continue

                    # Exclude check
                    if any(ig in rel_path for ig in ignored):
                        continue

                    if pattern and pattern.lower() not in rel_path.lower():
                        continue
                    
                    asset = {
                        "name": posixpath.basename(rel_path),
                        "fully_qualified_name": rel_path,
                        "type": "file"
                    }
                    
                    if include_metadata:
                        info = self._fs.info(f)
                        asset["metadata"] = {
                            "size_bytes": info.get('size'),
                            "last_modified": str(info.get('LastModified')),
                            "format": rel_path.split('.')[-1]
                        }
                    assets.append(asset)
            return assets
        except Exception as e:
            raise DataTransferError(f"Failed to discover S3 assets: {e}")

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
            raise SchemaDiscoveryError(f"S3 schema inference failed for {asset}: {e}")

    def read_batch(
        self, asset: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        path = f"s3://{self._config_model.bucket}/{asset}"
        fmt = asset.split('.')[-1].lower()
        incremental_filter = kwargs.get("incremental_filter")
        
        # Ensure limit and offset are integers
        limit = int(limit) if limit is not None else None
        offset = int(offset) if offset is not None else 0

        storage_options = {
            "key": self._config_model.aws_access_key_id,
            "secret": self._config_model.aws_secret_access_key,
            "client_kwargs": {"endpoint_url": self._config_model.endpoint_url} if self._config_model.endpoint_url else {}
        }

        try:
            df_iter: Iterator[pd.DataFrame]
            if fmt == 'csv':
                # Read in chunks to support filtering without OOM
                chunksize = kwargs.get("chunksize", kwargs.get("batch_size", 10000))
                skip_rows = range(1, offset + 1) if offset > 0 else None
                df_iter = pd.read_csv(path, storage_options=storage_options, chunksize=chunksize, skiprows=skip_rows)
            elif fmt == 'tsv':
                chunksize = kwargs.get("chunksize", kwargs.get("batch_size", 10000))
                skip_rows = range(1, offset + 1) if offset > 0 else None
                df_iter = pd.read_csv(path, storage_options=storage_options, sep='\t', chunksize=chunksize, skiprows=skip_rows)
            elif fmt == 'txt':
                chunksize = kwargs.get("chunksize", kwargs.get("batch_size", 10000))
                skip_rows = range(offset) if offset > 0 else None
                df_iter = pd.read_csv(path, storage_options=storage_options, sep='\n', header=None, names=['line'], chunksize=chunksize, skiprows=skip_rows)
            elif fmt == 'xml':
                df = pd.read_xml(path, storage_options=storage_options)
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            elif fmt in ('xls', 'xlsx'):
                df = pd.read_excel(path, storage_options=storage_options)
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            elif fmt == 'parquet':
                df = pd.read_parquet(path, storage_options=storage_options)
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            elif fmt in ('json', 'jsonl'):
                df = pd.read_json(path, storage_options=storage_options, lines=(fmt == 'jsonl'))
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            else:
                raise DataTransferError(f"Unsupported S3 file format: {fmt}")

            rows_yielded = 0
            for df in df_iter:
                # Apply Incremental Filter
                if incremental_filter and isinstance(incremental_filter, dict):
                    for col, val in incremental_filter.items():
                        if col in df.columns:
                            df = df[df[col] > val]
                
                if df.empty:
                    continue

                # Apply limit
                if limit is not None:
                    remaining = limit - rows_yielded
                    if remaining <= 0:
                        break
                    if len(df) > remaining:
                        df = df.iloc[:int(remaining)]
                
                rows_yielded += len(df)
                yield df

        except Exception as e:
            raise DataTransferError(f"S3 read failed for {asset}: {e}")

    def write_batch(
        self, data: Union[pd.DataFrame, Iterator[pd.DataFrame]], asset: str, mode: str = "append", **kwargs
    ) -> int:
        self.connect()
        path = f"s3://{self._config_model.bucket}/{asset}"
        fmt = asset.split('.')[-1].lower()
        
        storage_options = {
            "key": self._config_model.aws_access_key_id,
            "secret": self._config_model.aws_secret_access_key,
            "client_kwargs": {"endpoint_url": self._config_model.endpoint_url} if self._config_model.endpoint_url else {}
        }

        if isinstance(data, pd.DataFrame):
            data_iter = [data]
        else:
            data_iter = data

        total = 0
        try:
            # Handle append/replace logic
            if mode == 'replace' or not self._fs.exists(path):
                first_df = next(data_iter)
                self._write_df(first_df, path, fmt, storage_options, 'w')
                total += len(first_df)
            
            for df in data_iter:
                self._write_df(df, path, fmt, storage_options, 'a')
                total += len(df)
            return total
        except Exception as e:
            raise DataTransferError(f"S3 write failed for {asset}: {e}")

    def _write_df(self, df: pd.DataFrame, path: str, fmt: str, options: dict, mode: str):
        if fmt == 'csv':
            df.to_csv(path, index=False, storage_options=options, mode=mode, header=(mode == 'w'))
        elif fmt == 'parquet':
            # Parquet append is complex on S3, usually involves multiple files
            df.to_parquet(path, index=False, storage_options=options)
        elif fmt in ('json', 'jsonl'):
            df.to_json(path, orient='records', lines=(fmt == 'jsonl'), storage_options=options)

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError("Query execution is not supported for S3 connector.")

    # --- Live File Management Implementation ---

    def list_files(self, path: str = "") -> List[Dict[str, Any]]:
        self.connect()
        # Ensure path is relative to bucket root
        target_path = f"{self._config_model.bucket}/{path.lstrip('/')}"
        results = []
        try:
            # Use detail=True to get size and timestamps
            items = self._fs.ls(target_path, detail=True)
            for item in items:
                name = posixpath.basename(item['name'])
                if not name: # Handle bucket root case where basename is empty
                    continue
                
                results.append({
                    "name": name,
                    "path": item['name'].replace(f"{self._config_model.bucket}/", ""),
                    "type": "directory" if item['type'] == 'directory' else "file",
                    "size": item.get('size', 0),
                    "modified_at": item.get('LastModified').timestamp() if isinstance(item.get('LastModified'), datetime) else None
                })
            return results
        except Exception as e:
            logger.error(f"S3 list_files failed for {target_path}: {e}")
            raise DataTransferError(f"Failed to list S3 files: {e}")

    def download_file(self, path: str) -> bytes:
        self.connect()
        full_path = f"{self._config_model.bucket}/{path.lstrip('/')}"
        try:
            with self._fs.open(full_path, 'rb') as f:
                return f.read()
        except Exception as e:
            logger.error(f"S3 download failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to download S3 file: {e}")

    def upload_file(self, path: str, content: bytes) -> bool:
        self.connect()
        full_path = f"{self._config_model.bucket}/{path.lstrip('/')}"
        try:
            with self._fs.open(full_path, 'wb') as f:
                f.write(content)
            return True
        except Exception as e:
            logger.error(f"S3 upload failed to {full_path}: {e}")
            raise DataTransferError(f"Failed to upload S3 file: {e}")

    def delete_file(self, path: str) -> bool:
        self.connect()
        full_path = f"{self._config_model.bucket}/{path.lstrip('/')}"
        try:
            if self._fs.isdir(full_path):
                self._fs.rm(full_path, recursive=True)
            else:
                self._fs.rm(full_path)
            return True
        except Exception as e:
            logger.error(f"S3 delete failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to delete S3 item: {e}")

    def create_directory(self, path: str) -> bool:
        self.connect()
        # S3 doesn't have real directories, but we can create a placeholder file
        full_path = f"{self._config_model.bucket}/{path.lstrip('/')}/.keep"
        try:
            self._fs.touch(full_path)
            return True
        except Exception as e:
            logger.error(f"S3 mkdir failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to create S3 placeholder: {e}")