import os
import posixpath
import io
import stat
from typing import Any, Dict, Iterator, List, Optional, Union
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from app.connectors.base import BaseConnector
from app.core.errors import ConfigurationError, ConnectionFailedError, SchemaDiscoveryError, DataTransferError
from app.core.logging import get_logger

try:
    import paramiko
except ImportError:
    paramiko = None

logger = get_logger(__name__)

class SFTPConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    host: str = Field(..., description="SFTP Hostname or IP")
    port: int = Field(22, description="SFTP Port")
    username: str = Field(..., description="Username")
    password: Optional[str] = Field(None, description="Password")
    private_key: Optional[str] = Field(None, description="Private Key (PEM format)")
    private_key_passphrase: Optional[str] = Field(None, description="Passphrase for Private Key")
    base_path: str = Field("/", description="Base path to search for files")
    recursive: bool = Field(True, description="Recursively search for files")
    max_depth: Optional[int] = Field(None, ge=0, description="Maximum depth for recursion")
    exclude_patterns: Optional[str] = Field(None, description="Comma-separated list of folders/files to exclude")

class SFTPConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if paramiko is None:
            raise ConfigurationError("Paramiko client not installed. Run 'pip install paramiko'.")
        
        self._config_model: Optional[SFTPConfig] = None
        self._transport: Optional[paramiko.Transport] = None
        self._sftp: Optional[paramiko.SFTPClient] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = SFTPConfig.model_validate(self.config)
            if not self._config_model.password and not self._config_model.private_key:
                raise ConfigurationError("Either password or private_key must be provided.")
        except Exception as e:
            raise ConfigurationError(f"Invalid SFTP configuration: {e}")

    def connect(self) -> None:
        if self._sftp:
            return
        
        try:
            self._transport = paramiko.Transport((self._config_model.host, self._config_model.port))
            
            pkey = None
            if self._config_model.private_key:
                try:
                    pkey = paramiko.RSAKey.from_private_key(io.StringIO(self._config_model.private_key), password=self._config_model.private_key_passphrase)
                except Exception:
                    # Try Ed25519 or others if RSA fails, typically paramiko auto-detects from file, but from string is specific
                    # For simplicity, assuming RSA or generic key handling might require more robust logic
                    # Fallback to simple PKey loading
                    pkey = paramiko.PKey.from_private_key(io.StringIO(self._config_model.private_key), password=self._config_model.private_key_passphrase)

            self._transport.connect(username=self._config_model.username, password=self._config_model.password, pkey=pkey)
            self._sftp = paramiko.SFTPClient.from_transport(self._transport)
            
            # Verify path access
            try:
                self._sftp.listdir(self._config_model.base_path)
            except IOError:
                # Try creating it or fail? Often better to just verify connection success.
                pass
                
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to SFTP: {e}")

    def disconnect(self) -> None:
        if self._sftp:
            self._sftp.close()
            self._sftp = None
        if self._transport:
            self._transport.close()
            self._transport = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        assets = []
        base = self._config_model.base_path
        is_recursive = self._config_model.recursive
        max_depth = self._config_model.max_depth
        valid_extensions = {".csv", ".tsv", ".txt", ".xml", ".json", ".parquet", ".jsonl", ".avro", ".xls", ".xlsx"}
        max_assets = 10000
        
        ignored = {'.git', 'node_modules', '__pycache__', '.venv', 'venv'}
        if self._config_model.exclude_patterns:
            ignored.update({p.strip() for p in self._config_model.exclude_patterns.split(',') if p.strip()})

        # Recursive function to walk directories
        def walk_sftp(path, depth=0):
            if len(assets) >= max_assets:
                return

            # Depth limit check
            if max_depth is not None and depth > max_depth:
                return

            try:
                for entry in self._sftp.listdir_attr(path):
                    if len(assets) >= max_assets:
                        break

                    remote_path = posixpath.join(path, entry.filename)
                    
                    # Exclude check
                    if any(ig in remote_path for ig in ignored):
                        continue

                    if stat.S_ISDIR(entry.st_mode):
                        if is_recursive:
                            walk_sftp(remote_path, depth + 1)
                    else:
                        if pattern and pattern not in entry.filename:
                            continue
                        
                        ext = posixpath.splitext(entry.filename)[1].lower()
                        if ext in valid_extensions:
                            asset = {
                                "name": entry.filename,
                                "fully_qualified_name": remote_path,
                                "type": "file",
                                "format": ext.replace(".", "")
                            }
                            if include_metadata:
                                asset["metadata"] = {
                                    "size": entry.st_size,
                                    "modified_at": entry.st_mtime
                                }
                            assets.append(asset)
            except IOError:
                pass

        walk_sftp(base)
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
                
                if "int" in dtype_str: col_type = "integer"
                elif "float" in dtype_str or "double" in dtype_str: col_type = "float"
                elif "bool" in dtype_str: col_type = "boolean"
                elif "datetime" in dtype_str: col_type = "datetime"
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
            logger.error(f"Schema inference failed for SFTP file {asset}: {e}")
            raise SchemaDiscoveryError(f"SFTP schema inference failed for {asset}: {e}")

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        
        # We must keep the file open while reading, or download it temp
        # For simplicity and standard compliance with pandas, we'll read into memory/BytesIO
        # Note: Large files over SFTP should ideally be downloaded to local temp first for speed
        
        with self._sftp.file(asset, mode='rb') as f:
            # Check size, if huge maybe warn or use temp file
            # For this impl, assume it fits in memory or we read chunks
            
            # Since pandas requires a seekable stream usually, and paramiko file acts like one mostly
            # but sometimes slow.
            
            ext = posixpath.splitext(asset)[1].lower()
            chunksize = kwargs.get("chunksize", 10000)
            
            if ext == ".csv":
                reader = pd.read_csv(f, chunksize=chunksize)
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
                    if limit is not None and rows >= limit: break
            
            elif ext == ".tsv":
                reader = pd.read_csv(f, sep='\t', chunksize=chunksize)
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
                    if limit is not None and rows >= limit: break

            elif ext == ".txt":
                reader = pd.read_csv(f, sep='\n', header=None, names=['line'], chunksize=chunksize)
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
                    if limit is not None and rows >= limit: break

            elif ext in (".xml", ".xls", ".xlsx", ".parquet", ".json"):
                # These formats usually require a seekable stream or full file
                bio = io.BytesIO(f.read())
                if ext == ".xml":
                    df = pd.read_xml(bio)
                elif ext in (".xls", ".xlsx"):
                    df = pd.read_excel(bio)
                elif ext == ".parquet":
                    df = pd.read_parquet(bio)
                elif ext == ".json":
                    df = pd.read_json(bio)
                
                df = self.slice_dataframe(df, offset, limit)
                yield df
            
            elif ext == ".jsonl":
                reader = pd.read_json(f, lines=True, chunksize=chunksize)
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
                    if limit and rows >= limit: break

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.concat(list(data))
            
        ext = posixpath.splitext(asset)[1].lower()
        bio = io.BytesIO()
        
        if ext == ".csv": df.to_csv(bio, index=False)
        elif ext == ".parquet": df.to_parquet(bio, index=False)
        elif ext == ".json": df.to_json(bio, orient="records")
        elif ext == ".jsonl": df.to_json(bio, orient="records", lines=True)
        
        bio.seek(0)
        
        # mode support in SFTP? Paramiko open(mode='w'/'a')
        # But writing binary data (parquet/zip) in 'a' mode is risky without ensuring header compatibility
        # We default to overwrite ('w') for structured files unless it's CSV
        
        file_mode = 'w'
        if mode == 'append' and ext in ['.csv', '.jsonl']:
            # We can try to append
            file_mode = 'a'
            # Note: headers in CSV might be an issue if appending
        
        with self._sftp.file(asset, mode=file_mode) as f:
            f.write(bio.getvalue())
            
        return len(df)

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        raise NotImplementedError("SFTP connector does not support direct queries.")

    # --- Live File Management Implementation ---

    def list_files(self, path: str = "") -> List[Dict[str, Any]]:
        self.connect()
        target_path = path if path else self._config_model.base_path
        results = []
        try:
            for entry in self._sftp.listdir_attr(target_path):
                results.append({
                    "name": entry.filename,
                    "path": posixpath.join(target_path, entry.filename),
                    "type": "directory" if stat.S_ISDIR(entry.st_mode) else "file",
                    "size": entry.st_size,
                    "modified_at": entry.st_mtime
                })
            return results
        except IOError as e:
            logger.error(f"SFTP list_files failed for {target_path}: {e}")
            raise DataTransferError(f"Failed to list SFTP files: {e}")

    def download_file(self, path: str) -> bytes:
        self.connect()
        try:
            bio = io.BytesIO()
            self._sftp.getfo(path, bio)
            return bio.getvalue()
        except Exception as e:
            logger.error(f"SFTP download failed for {path}: {e}")
            raise DataTransferError(f"Failed to download SFTP file: {e}")

    def upload_file(self, path: str, content: bytes) -> bool:
        self.connect()
        try:
            bio = io.BytesIO(content)
            self._sftp.putfo(bio, path)
            return True
        except Exception as e:
            logger.error(f"SFTP upload failed to {path}: {e}")
            raise DataTransferError(f"Failed to upload SFTP file: {e}")

    def delete_file(self, path: str) -> bool:
        self.connect()
        try:
            # Check if it's a directory
            s = self._sftp.stat(path)
            if stat.S_ISDIR(s.st_mode):
                self._sftp.rmdir(path)
            else:
                self._sftp.remove(path)
            return True
        except Exception as e:
            logger.error(f"SFTP delete failed for {path}: {e}")
            raise DataTransferError(f"Failed to delete SFTP item: {e}")

    def create_directory(self, path: str) -> bool:
        self.connect()
        try:
            self._sftp.mkdir(path)
            return True
        except Exception as e:
            logger.error(f"SFTP mkdir failed for {path}: {e}")
            raise DataTransferError(f"Failed to create SFTP directory: {e}")

    def zip_directory(self, path: str) -> bytes:
        self.connect()
        import zipfile
        
        output_bio = io.BytesIO()
        try:
            with zipfile.ZipFile(output_bio, "w", zipfile.ZIP_DEFLATED) as zf:
                def _recursive_zip(remote_path, zip_path_prefix=""):
                    for entry in self._sftp.listdir_attr(remote_path):
                        full_remote_path = posixpath.join(remote_path, entry.filename)
                        current_zip_path = posixpath.join(zip_path_prefix, entry.filename)
                        
                        if stat.S_ISDIR(entry.st_mode):
                            _recursive_zip(full_remote_path, current_zip_path)
                        else:
                            with self._sftp.file(full_remote_path, 'rb') as f:
                                zf.writestr(current_zip_path, f.read())
                
                _recursive_zip(path)
            return output_bio.getvalue()
        except Exception as e:
            logger.error(f"SFTP zip_directory failed for {path}: {e}")
            raise DataTransferError(f"Failed to zip SFTP directory: {e}")
