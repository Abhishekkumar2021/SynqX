from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, List, Iterator, Union, Generator
from contextlib import contextmanager
import pandas as pd
from synqx_core.logging import get_logger

logger = get_logger(__name__)


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
        mode: str = "auto",
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

    def read_cdc(
        self,
        **kwargs
    ) -> Iterator[pd.DataFrame]:
        """
        Optional method for connectors that support native CDC / Log Tailing.
        """
        raise NotImplementedError(f"CDC not supported for {self.__class__.__name__}")

    @abstractmethod
    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        pass

    def supports_staging(self) -> bool:
        """
        Returns True if this connector supports native 'Stage & Load' (e.g. S3 -> Snowflake).
        """
        return False

    def write_staged(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        stage_connector: "BaseConnector",
        mode: str = "append",
        **kwargs,
    ) -> int:
        """
        High-performance write using an intermediate staging area (e.g. S3).
        1. Write data to staging area as Parquet/CSV.
        2. Trigger native LOAD/COPY command from warehouse.
        """
        raise NotImplementedError(f"Staged write not supported for {self.__class__.__name__}")

    def fetch_sample(
        self, asset: str, limit: int = 100, **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetch a sample of rows from the asset for preview purposes.
        """
        try:
            chunks = []
            rows_collected = 0
            
            for df in self.read_batch(asset, limit=limit, **kwargs):
                chunks.append(df)
                rows_collected += len(df)
                if rows_collected >= limit:
                    break
            
            if not chunks:
                return []
                
            full_df = pd.concat(chunks, ignore_index=True)
            if len(full_df) > limit:
                full_df = full_df.iloc[:limit]
                
            return full_df.where(pd.notnull(full_df), None).to_dict(orient="records")
        except Exception as e:
            logger.error(f"Error fetching sample for {asset}: {e}")
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

    def get_total_count(self, query_or_asset: str, is_query: bool = False, **kwargs) -> Optional[int]:
        """
        Get the total number of rows for a query or asset.
        """
        return None

    def list_files(self, path: str = "") -> List[Dict[str, Any]]:
        raise NotImplementedError(f"Live file listing not supported for {self.__class__.__name__}")

    def download_file(self, path: str) -> bytes:
        raise NotImplementedError(f"File download not supported for {self.__class__.__name__}")

    def upload_file(self, path: str, content: bytes) -> bool:
        raise NotImplementedError(f"File upload not supported for {self.__class__.__name__}")

    def delete_file(self, path: str) -> bool:
        raise NotImplementedError(f"File deletion not supported for {self.__class__.__name__}")

    def create_directory(self, path: str) -> bool:
        raise NotImplementedError(f"Directory creation not supported for {self.__class__.__name__}")

    def zip_directory(self, path: str) -> bytes:
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

    def supports_pushdown(self) -> bool:
        return False

    def _clean_internal_kwargs(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Removes internal SynqX metadata from kwargs to prevent passing them 
        to underlying libraries (like pandas or sqlalchemy) that don't support them.
        """
        internal_keys = [
            "ui", "connection_id", "batch_size", "incremental", 
            "incremental_filter", "watermark_column", "WATERMARK_COLUMN", 
            "table", "write_mode", "write_strategy", "target_table",
            "schema_evolution_policy", "chunksize", "sync_mode", "cdc_config"
        ]
        for key in internal_keys:
            kwargs.pop(key, None)
        return kwargs
