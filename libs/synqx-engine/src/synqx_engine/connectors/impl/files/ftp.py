import io
import posixpath
from collections.abc import Iterator
from ftplib import FTP, FTP_TLS
from typing import Any

import pandas as pd
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from synqx_core.errors import (
    ConfigurationError,
    ConnectionFailedError,
    DataTransferError,
    SchemaDiscoveryError,
)
from synqx_core.logging import get_logger
from synqx_core.utils.data import is_df_empty

from synqx_engine.connectors.base import BaseConnector

logger = get_logger(__name__)


class FTPConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    host: str = Field(..., description="FTP Hostname or IP")
    port: int = Field(21, description="FTP Port")
    username: str = Field("anonymous", description="Username")
    password: str = Field("", description="Password")
    use_tls: bool = Field(False, description="Use FTPS (FTP over TLS)")
    passive_mode: bool = Field(True, description="Use passive mode")
    base_path: str = Field("/", description="Base path to search for files")
    recursive: bool = Field(True, description="Recursively search for files")
    max_depth: int | None = Field(None, ge=0, description="Maximum depth for recursion")
    exclude_patterns: str | None = Field(
        None, description="Comma-separated list of folders/files to exclude"
    )


class FTPConnector(BaseConnector):
    """
    Robust Connector for FTP/FTPS.
    """

    def __init__(self, config: dict[str, Any]):
        self._config_model: FTPConfig | None = None
        self._ftp: FTP | None = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = FTPConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid FTP configuration: {e}")  # noqa: B904

    def connect(self) -> None:
        if self._ftp:
            try:
                self._ftp.voidcmd("NOOP")
                return
            except Exception:
                self.disconnect()

        try:
            if self._config_model.use_tls:
                self._ftp = FTP_TLS()
            else:
                self._ftp = FTP()

            self._ftp.connect(self._config_model.host, self._config_model.port)
            self._ftp.login(self._config_model.username, self._config_model.password)

            if self._config_model.use_tls:
                self._ftp.prot_p()  # Switch to secure data connection

            self._ftp.set_pasv(self._config_model.passive_mode)

            # Change to base directory if specified
            if self._config_model.base_path != "/":
                self._ftp.cwd(self._config_model.base_path)

        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to FTP: {e}")  # noqa: B904

    def disconnect(self) -> None:
        if self._ftp:
            try:
                self._ftp.quit()
            except Exception:
                try:
                    self._ftp.close()
                except Exception:
                    pass
            self._ftp = None

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
        assets = []
        base = self._config_model.base_path
        is_recursive = self._config_model.recursive
        max_depth = self._config_model.max_depth
        valid_extensions = {
            ".csv",
            ".tsv",
            ".txt",
            ".xml",
            ".json",
            ".parquet",
            ".jsonl",
            ".avro",
            ".xls",
            ".xlsx",
        }
        max_assets = 10000

        ignored = {".git", "node_modules", "__pycache__", ".venv", "venv"}
        if self._config_model.exclude_patterns:
            ignored.update(
                {
                    p.strip()
                    for p in self._config_model.exclude_patterns.split(",")
                    if p.strip()
                }
            )

        def walk_ftp(path, depth=0):
            if len(assets) >= max_assets:
                return
            if max_depth is not None and depth > max_depth:
                return

            try:
                original_cwd = self._ftp.pwd()
                self._ftp.cwd(path)
                
                entries = []
                self._ftp.retrlines("LIST", entries.append)
                
                for entry in entries:
                    if len(assets) >= max_assets:
                        break
                    
                    # FTP LIST output is non-standard. Simple parsing:
                    # drwxr-xr-x  2 user group  4096 Jan 1 00:00 dirname
                    parts = entry.split(None, 8)
                    if len(parts) < 9:
                        continue
                        
                    is_dir = parts[0].startswith("d")
                    name = parts[8]
                    
                    if name in (".", ".."):
                        continue
                        
                    remote_path = posixpath.join(path, name)
                    
                    if any(ig in name for ig in ignored):
                        continue

                    if is_dir:
                        if is_recursive:
                            walk_ftp(remote_path, depth + 1)
                    else:
                        if pattern and pattern not in name:
                            continue

                        ext = posixpath.splitext(name)[1].lower()
                        if ext in valid_extensions:
                            asset = {
                                "name": name,
                                "fully_qualified_name": remote_path,
                                "type": "file",
                                "format": ext.replace(".", ""),
                            }
                            if include_metadata:
                                # We can't easily get precise metadata from LIST 
                                # without MLSD which isn't always supported.
                                try:
                                    size = self._ftp.size(remote_path)
                                    asset["metadata"] = {"size": size}
                                except Exception:
                                    pass
                            assets.append(asset)
                            
                self._ftp.cwd(original_cwd)
            except Exception:
                pass

        walk_ftp(base)
        return assets

    def infer_schema(
        self, asset: str, sample_size: int = 1000, **kwargs
    ) -> dict[str, Any]:
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
                    first_val = df[col].dropna().iloc[0] if not is_df_empty(df[col].dropna()) else None
                    if isinstance(first_val, (dict, list)): col_type = "json"

                columns.append({"name": col, "type": col_type, "native_type": str(dtype)})

            return {
                "asset": asset,
                "columns": columns,
                "format": asset.split(".")[-1].lower() if "." in asset else "unknown",
                "row_count_estimate": len(df),
            }
        except Exception as e:
            raise SchemaDiscoveryError(f"FTP schema inference failed for {asset}: {e}") # noqa: B904

    def read_batch(
        self,
        asset: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        ext = posixpath.splitext(asset)[1].lower()
        chunksize = kwargs.get("chunksize", 10000)

        bio = io.BytesIO()
        try:
            self._ftp.retrbinary(f"RETR {asset}", bio.write)
            bio.seek(0)
            
            if ext == ".csv":
                reader = pd.read_csv(bio, chunksize=chunksize)
                rows = 0
                for df in reader:
                    if limit is not None:
                        remaining = limit - rows
                        if remaining <= 0: break
                        if len(df) > remaining: df = df.iloc[:int(remaining)]
                    yield df
                    rows += len(df)
                    if limit is not None and rows >= limit: break
            elif ext == ".parquet":
                df = pd.read_parquet(bio)
                yield self.slice_dataframe(df, offset, limit)
            elif ext == ".json":
                df = pd.read_json(bio)
                yield self.slice_dataframe(df, offset, limit)
            elif ext == ".jsonl":
                reader = pd.read_json(bio, lines=True, chunksize=chunksize)
                rows = 0
                for df in reader:
                    if limit is not None:
                        remaining = limit - rows
                        if remaining <= 0: break
                        if len(df) > remaining: df = df.iloc[:int(remaining)]
                    yield df
                    rows += len(df)
                    if limit is not None and rows >= limit: break
            else:
                # Basic fallback
                df = pd.read_csv(bio) if ext in (".csv", ".tsv") else pd.read_json(bio)
                yield self.slice_dataframe(df, offset, limit)
        except Exception as e:
            raise DataTransferError(f"FTP read failed for {asset}: {e}") # noqa: B904

    def write_batch(
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
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
        else: df.to_csv(bio, index=False)
        
        bio.seek(0)
        try:
            self._ftp.storbinary(f"STOR {asset}", bio)
            return len(df)
        except Exception as e:
            raise DataTransferError(f"FTP write failed for {asset}: {e}") # noqa: B904

    def execute_query(self, query: str, **kwargs) -> list[dict[str, Any]]:
        raise NotImplementedError("FTP connector does not support direct queries.")

    # --- Live File Management ---
    def list_files(self, path: str = "") -> list[dict[str, Any]]:
        self.connect()
        target_path = path if path else self._config_model.base_path
        results = []
        try:
            lines = []
            self._ftp.retrlines(f"LIST {target_path}", lines.append)
            for line in lines:
                parts = line.split(None, 8)
                if len(parts) < 9: continue
                is_dir = parts[0].startswith("d")
                name = parts[8]
                if name in (".", ".."): continue
                results.append({
                    "name": name,
                    "path": posixpath.join(target_path, name),
                    "type": "directory" if is_dir else "file",
                    "size": int(parts[4]) if not is_dir else 0,
                    "modified_at": None # Hard to parse from LIST
                })
            return results
        except Exception as e:
            raise DataTransferError(f"Failed to list FTP files: {e}") # noqa: B904

    def download_file(self, path: str) -> bytes:
        self.connect()
        bio = io.BytesIO()
        self._ftp.retrbinary(f"RETR {path}", bio.write)
        return bio.getvalue()

    def upload_file(self, path: str, content: bytes) -> bool:
        self.connect()
        bio = io.BytesIO(content)
        self._ftp.storbinary(f"STOR {path}", bio)
        return True

    def delete_file(self, path: str) -> bool:
        self.connect()
        try:
            self._ftp.delete(path)
        except Exception:
            self._ftp.rmd(path)
        return True

    def create_directory(self, path: str) -> bool:
        self.connect()
        self._ftp.mkd(path)
        return True
