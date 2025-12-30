from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, List, Iterator, Union, Generator
from contextlib import contextmanager
import pandas as pd


class BaseConnector(ABC):
    """
    Abstract Base Class for all data connectors (Sources and Destinations).
    Enforces a standard interface for connection management, schema discovery,
    and data transfer (IO).
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.validate_config()

    def normalize_asset_identifier(self, asset: str) -> tuple[str, Optional[str]]:
        """
        Standardizes asset identifier handling. 
        Returns (asset_name, schema_name).
        If the asset is an FQN (e.g. 'db.schema.table' or 'public.users'), 
        it splits the last part as the name.
        Otherwise, it uses the default schema from configuration if available.
        """
        config_schema = self.config.get("db_schema") or self.config.get("schema")
        if "." in asset:
            parts = asset.rsplit(".", 1)
            return parts[1], parts[0]
        return asset, config_schema

    @abstractmethod
    def validate_config(self) -> None:
        pass

    @abstractmethod
    def connect(self) -> None:
        pass

    @abstractmethod
    def disconnect(self) -> None:
        pass

    @abstractmethod
    def test_connection(self) -> bool:
        pass

    @contextmanager
    def session(self) -> Generator["BaseConnector", None, None]:
        self.connect()
        try:
            yield self
        finally:
            self.disconnect()

    @abstractmethod
    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def infer_schema(
        self,
        asset: str,
        sample_size: int = 1000,
        mode: str = "auto",  # "metadata", "sample", or "auto"
        **kwargs,
    ) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        pass

    @abstractmethod
    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        pass

    def fetch_sample(
        self, asset: str, limit: int = 100, **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetch a sample of rows from the asset for preview purposes.
        """
        try:
            df = next(self.read_batch(asset, limit=limit, **kwargs))
            # Convert NaN to None for JSON serialization
            return df.where(pd.notnull(df), None).to_dict(orient="records")
        except StopIteration:
            return []
        except Exception:
            # If read_batch fails, we return an empty list or re-raise if it's a critical error
            # For sample data, returning empty list is often safer for UI
            return []

    @abstractmethod
    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        pass

    # --- Live File Management (WinSCP-like features) ---
    
    def list_files(self, path: str = "") -> List[Dict[str, Any]]:
        """List files and directories at the given path in real-time."""
        raise NotImplementedError(f"Live file listing not supported for {self.__class__.__name__}")

    def download_file(self, path: str) -> bytes:
        """Download a file's content as bytes."""
        raise NotImplementedError(f"File download not supported for {self.__class__.__name__}")

    def upload_file(self, path: str, content: bytes) -> bool:
        """Upload content to a file at the given path."""
        raise NotImplementedError(f"File upload not supported for {self.__class__.__name__}")

    def delete_file(self, path: str) -> bool:
        """Delete a file or directory at the given path."""
        raise NotImplementedError(f"File deletion not supported for {self.__class__.__name__}")

    def create_directory(self, path: str) -> bool:
        """Create a new directory at the given path."""
        raise NotImplementedError(f"Directory creation not supported for {self.__class__.__name__}")

    def zip_directory(self, path: str) -> bytes:
        """Compress a directory and its contents into a ZIP file and return as bytes."""
        raise NotImplementedError(f"Directory zipping not supported for {self.__class__.__name__}")

    @staticmethod
    def slice_dataframe(df: pd.DataFrame, offset: Optional[int], limit: Optional[int]):
        if offset is not None:
            df = df.iloc[int(offset):]
        if limit is not None:
            df = df.iloc[:int(limit)]
        return df

    @staticmethod
    def chunk_dataframe(df: pd.DataFrame, chunksize: int):
        for i in range(0, len(df), chunksize):
            yield df.iloc[i : i + chunksize]
