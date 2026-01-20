import os
from collections.abc import Iterator
from datetime import datetime
from typing import Any

import pandas as pd
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from synqx_core.errors import (
    ConfigurationError,
    DataTransferError,
    SchemaDiscoveryError,
)
from synqx_core.logging import get_logger
from synqx_core.utils.data import is_df_empty

from synqx_engine.connectors.base import BaseConnector

logger = get_logger(__name__)


class LocalFileConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    base_path: str = Field(..., description="Base directory for files")
    recursive: bool = Field(True, description="Recursively search for files")
    max_depth: int | None = Field(
        None, ge=0, description="Maximum depth for recursion (None for unlimited)"
    )
    exclude_patterns: str | None = Field(
        None, description="Comma-separated list of folders/files to exclude"
    )


class LocalFileConnector(BaseConnector):
    """
    Robust Connector for Local Filesystem.
    """

    def __init__(self, config: dict[str, Any]):
        self._config_model: LocalFileConfig | None = None
        super().__init__(config)

    def validate_config(self):
        try:
            self._config_model = LocalFileConfig.model_validate(self.config)
            if not self._config_model.base_path:
                raise ValueError("base_path cannot be empty")
        except Exception as e:
            raise ConfigurationError(f"Invalid LocalFile configuration: {e}")  # noqa: B904

    def connect(self) -> None:
        pass

    def disconnect(self) -> None:
        pass

    def test_connection(self) -> bool:
        return os.path.isdir(self._config_model.base_path)

    def _get_full_path(self, asset: str) -> str:
        # Prevent path traversal
        base = os.path.abspath(self._config_model.base_path)

        # Normalize asset path separators to match OS (handle / from frontend)
        # We also strip leading separators to ensure os.path.join works as relative append  # noqa: E501
        asset_norm = asset.replace("/", os.sep)
        if os.altsep:
            asset_norm = asset_norm.replace(os.altsep, os.sep)

        # Strip potential leading separators to treat as relative
        asset_norm = asset_norm.lstrip(os.sep)

        # If asset is already absolute and starts with base, use it
        if os.path.isabs(asset) and asset.startswith(base):
            return os.path.abspath(asset)

        path = os.path.join(base, asset_norm)
        full_path = os.path.abspath(path)

        if not full_path.startswith(base):
            raise ValueError(
                f"Access denied: Path {full_path} is outside base directory {base}"
            )

        return full_path

    def discover_assets(  # noqa: PLR0912, PLR0915
        self, pattern: str | None = None, include_metadata: bool = False, **kwargs
    ) -> list[dict[str, Any]]:
        base = os.path.abspath(self._config_model.base_path)
        is_recursive = self._config_model.recursive
        max_depth = self._config_model.max_depth

        valid_extensions = {
            ".csv",
            ".tsv",
            ".txt",
            ".xml",
            ".parquet",
            ".json",
            ".jsonl",
            ".xls",
            ".xlsx",
        }

        # Default ignored directories
        ignored_dirs = {
            ".git",
            "node_modules",
            "__pycache__",
            ".venv",
            "venv",
            ".ruff_cache",
            ".pytest_cache",
            ".DS_Store",
        }

        # Add user-defined exclusions
        if self._config_model.exclude_patterns:
            user_excludes = {
                p.strip()
                for p in self._config_model.exclude_patterns.split(",")
                if p.strip()
            }
            ignored_dirs.update(user_excludes)

        # Basic .gitignore handling
        ignore_patterns = list(ignored_dirs)
        gitignore_path = os.path.join(base, ".gitignore")
        if os.path.exists(gitignore_path):
            try:
                with open(gitignore_path) as f:
                    for line in f:
                        line = line.strip()  # noqa: PLW2901
                        if line and not line.startswith("#"):
                            ignore_patterns.append(line)
            except Exception as e:
                logger.warning(f"Failed to read .gitignore at {base}: {e}")

        files = []
        max_files = 10000  # Safety limit

        try:
            for root, dirs, filenames in os.walk(base, topdown=True):
                # Calculate current depth relative to base
                rel_root = os.path.relpath(root, base)
                depth = 0 if rel_root == "." else len(rel_root.split(os.sep))

                # Prune ignored directories in-place
                dirs[:] = [d for d in dirs if d not in ignored_dirs]

                # Check if we should stop recursion based on depth or recursive flag
                if not is_recursive:
                    if os.path.abspath(root) != base:
                        dirs[:] = []
                        continue
                elif max_depth is not None and depth >= max_depth:
                    dirs[:] = []

                for filename in filenames:
                    if len(files) >= max_files:
                        logger.warning(
                            f"Reached max discovery limit of {max_files} assets for {base}"  # noqa: E501
                        )
                        return files

                    ext = os.path.splitext(filename)[1].lower()
                    if ext not in valid_extensions:
                        continue

                    full_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(full_path, base)

                    # Simple pattern matching for asset discovery
                    if (
                        pattern
                        and pattern.lower() not in filename.lower()
                        and pattern.lower() not in rel_path.lower()
                    ):
                        continue

                    is_ignored = False
                    for p in ignore_patterns:
                        if p in rel_path or p in filename:
                            is_ignored = True
                            break
                    if is_ignored:
                        continue

                    asset = {
                        "name": filename,
                        "fully_qualified_name": rel_path,
                        "type": "file",
                    }

                    if include_metadata:
                        stat = os.stat(full_path)
                        asset.update(
                            {
                                "size_bytes": stat.st_size,
                                "last_modified": datetime.fromtimestamp(
                                    stat.st_mtime
                                ).isoformat(),
                                "format": ext.replace(".", "").upper(),
                            }
                        )

                    files.append(asset)
            return files
        except Exception as e:
            raise DataTransferError(  # noqa: B904
                f"Filesystem discovery failed for path '{base}': {e!s}"
            )

    def infer_schema(
        self, asset: str, sample_size: int = 1000, **kwargs
    ) -> dict[str, Any]:
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
                    first_val = (
                        df[col].dropna().iloc[0]
                        if not is_df_empty(df[col].dropna())
                        else None
                    )
                    if isinstance(first_val, (dict, list)):
                        col_type = "json"

                columns.append(
                    {"name": col, "type": col_type, "native_type": str(dtype)}
                )

            return {
                "asset": asset,
                "columns": columns,
                "format": asset.split(".")[-1].upper() if "." in asset else "UNKNOWN",
                "row_count_estimate": len(df),
            }
        except Exception as e:
            raise SchemaDiscoveryError(  # noqa: B904
                f"Automated schema inference failed for '{asset}': {e!s}"
            )

    def read_batch(  # noqa: PLR0912, PLR0915
        self,
        asset: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        path = self._get_full_path(asset)
        fmt = asset.split(".")[-1].lower()
        incremental_filter = kwargs.get("incremental_filter")

        limit = int(limit) if limit is not None else None
        offset = int(offset) if offset is not None else 0

        if not os.path.exists(path):
            raise DataTransferError(f"Local resource not found at path: {path}")

        try:
            df_iter: Iterator[pd.DataFrame]

            # Standardize chunksize
            chunksize_val = kwargs.get("chunksize") or kwargs.get("batch_size")
            chunksize = (
                int(chunksize_val)
                if chunksize_val and int(chunksize_val) > 0
                else 10000
            )

            if fmt == "csv":
                skip_rows = range(1, offset + 1) if offset > 0 else None
                df_iter = pd.read_csv(path, chunksize=chunksize, skiprows=skip_rows)
            elif fmt == "tsv":
                skip_rows = range(1, offset + 1) if offset > 0 else None
                df_iter = pd.read_csv(
                    path, sep="\t", chunksize=chunksize, skiprows=skip_rows
                )
            elif fmt == "txt":
                skip_rows = range(offset) if offset > 0 else None
                df_iter = pd.read_csv(
                    path,
                    sep="\n",
                    header=None,
                    names=["line"],
                    chunksize=chunksize,
                    skiprows=skip_rows,
                )
            elif fmt == "xml":
                df = pd.read_xml(path)
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            elif fmt == "parquet":
                df = pd.read_parquet(path)
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            elif fmt in ("json", "jsonl"):
                try:
                    df = pd.read_json(path, lines=(fmt == "jsonl"))
                except ValueError:
                    # Fallback for .json files that were written in append mode (JSONL)
                    if fmt == "json":
                        df = pd.read_json(path, lines=True)
                    else:
                        raise
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            elif fmt in ("xls", "xlsx"):
                df = pd.read_excel(path)
                df_iter = iter([self.slice_dataframe(df, offset, None)])
            else:
                raise DataTransferError(f"Unsupported filesystem format: '{fmt}'")

            rows_yielded = 0
            for df in df_iter:
                if incremental_filter and isinstance(incremental_filter, dict):
                    for col, val in incremental_filter.items():
                        if col in df.columns:
                            df = df[df[col] > val]  # noqa: PLW2901

                if is_df_empty(df):
                    continue

                if limit is not None:
                    remaining = limit - rows_yielded
                    if remaining <= 0:
                        break
                    if len(df) > remaining:
                        df = df.iloc[: int(remaining)]  # noqa: PLW2901

                rows_yielded += len(df)
                yield df

        except Exception as e:
            raise DataTransferError(  # noqa: B904
                f"Stream read failed for local resource '{asset}': {e!s}"
            )

    def write_batch(  # noqa: PLR0912
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        path = self._get_full_path(asset)
        fmt = asset.split(".")[-1].lower()

        clean_mode = mode.lower()
        if clean_mode == "replace":
            clean_mode = "overwrite"

        os.makedirs(os.path.dirname(path), exist_ok=True)

        if isinstance(data, pd.DataFrame):
            data_iter = [data]
        else:
            data_iter = data

        total = 0
        try:
            first = True
            for df in data_iter:
                if df is None:
                    continue

                # Robust conversion to Pandas if needed
                if not isinstance(df, pd.DataFrame):
                    if hasattr(df, "to_pandas"):
                        df = df.to_pandas()  # noqa: PLW2901
                    else:
                        df = pd.DataFrame(df)  # noqa: PLW2901

                if is_df_empty(df):
                    continue

                write_mode = (
                    "w"
                    if (first and clean_mode == "overwrite") or not os.path.exists(path)
                    else "a"
                )
                header = (
                    True if write_mode == "w" or not os.path.exists(path) else False
                )

                if fmt == "csv":
                    df.to_csv(path, index=False, mode=write_mode, header=header)
                elif fmt == "tsv":
                    df.to_csv(
                        path, sep="\t", index=False, mode=write_mode, header=header
                    )
                elif fmt == "txt":
                    df.iloc[:, 0].to_csv(
                        path, index=False, header=False, mode=write_mode
                    )
                elif fmt == "xml":
                    df.to_xml(path, index=False)
                elif fmt == "parquet":
                    df.to_parquet(path, index=False)
                elif fmt in ("json", "jsonl"):
                    # Always use JSON Lines for robust streaming/appending
                    df.to_json(path, orient="records", lines=True, mode=write_mode)

                total += len(df)
                first = False
            return total
        except Exception as e:
            raise DataTransferError(  # noqa: B904
                f"Target commit failed for local resource '{asset}': {e!s}"
            )

    def execute_query(
        self,
        query: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError(
            "Query execution is not supported for Local File connector."
        )

    # --- Live File Management Implementation ---

    def list_files(self, path: str = "") -> list[dict[str, Any]]:
        target_path = (
            self._get_full_path(path)
            if path
            else os.path.abspath(self._config_model.base_path)
        )
        results = []
        try:
            for entry in os.scandir(target_path):
                stat_info = entry.stat()
                # Get relative path using system separator
                rel_path = os.path.relpath(
                    entry.path, os.path.abspath(self._config_model.base_path)
                )
                # Normalize to forward slashes for API/Frontend consistency
                rel_path_fwd = rel_path.replace(os.sep, "/")

                results.append(
                    {
                        "name": entry.name,
                        "path": rel_path_fwd,
                        "type": "directory" if entry.is_dir() else "file",
                        "size": stat_info.st_size,
                        "modified_at": stat_info.st_mtime,
                    }
                )
            return results
        except Exception as e:
            logger.error(f"Local list_files failed for {target_path}: {e}")
            raise DataTransferError(f"Failed to list local files: {e}")  # noqa: B904

    def download_file(self, path: str) -> bytes:
        full_path = self._get_full_path(path)
        try:
            with open(full_path, "rb") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Local download failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to download local file: {e}")  # noqa: B904

    def upload_file(self, path: str, content: bytes) -> bool:
        full_path = self._get_full_path(path)
        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as f:
                f.write(content)
            return True
        except Exception as e:
            logger.error(f"Local upload failed to {full_path}: {e}")
            raise DataTransferError(f"Failed to upload local file: {e}")  # noqa: B904

    def delete_file(self, path: str) -> bool:
        full_path = self._get_full_path(path)
        try:
            if os.path.isdir(full_path):
                import shutil  # noqa: PLC0415

                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            return True
        except Exception as e:
            logger.error(f"Local delete failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to delete local item: {e}")  # noqa: B904

    def create_directory(self, path: str) -> bool:
        full_path = self._get_full_path(path)
        try:
            os.makedirs(full_path, exist_ok=True)
            return True
        except Exception as e:
            logger.error(f"Local mkdir failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to create local directory: {e}")  # noqa: B904

    def zip_directory(self, path: str) -> bytes:
        full_path = self._get_full_path(path)
        import io  # noqa: PLC0415
        import zipfile  # noqa: PLC0415

        output_bio = io.BytesIO()
        try:
            with zipfile.ZipFile(output_bio, "w", zipfile.ZIP_DEFLATED) as zf:
                for root, _, files in os.walk(full_path):
                    for file in files:
                        file_full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_full_path, full_path)
                        zf.write(file_full_path, rel_path)
            return output_bio.getvalue()
        except Exception as e:
            logger.error(f"Local zip_directory failed for {full_path}: {e}")
            raise DataTransferError(f"Failed to zip local directory: {e}")  # noqa: B904
