from abc import ABC, abstractmethod
from typing import Any, Dict, Iterator, List
import polars as pl
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class PolarsTransform(ABC):
    """
    Abstract Base Class for high-performance Polars-based transformations.
    Uses Rust-backed Arrow memory for massive performance gains over Pandas.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.on_chunk = config.get("_on_chunk")
        self.validate_config()

    @abstractmethod
    def validate_config(self) -> None:
        """Validate the configuration."""
        pass

    @abstractmethod
    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        """Apply Polars transformation to the data stream."""
        pass

    def get_lineage_map(self, input_columns: List[str]) -> Dict[str, List[str]]:
        """
        Returns a mapping of Output Column -> List of Input Columns.
        Default implementation assumes identity mapping (pass-through).
        """
        return {col: [col] for col in input_columns}

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        """Apply transformation to multiple Polars data streams."""
        raise NotImplementedError("Multi-input Polars transformation not implemented for this operator.")

    def get_config_value(self, key: str, default: Any = None, required: bool = False) -> Any:
        val = self.config.get(key, default)
        if required and val is None:
            from synqx_core.errors import ConfigurationError
            raise ConfigurationError(f"Missing required configuration key: {key}")
        return val
