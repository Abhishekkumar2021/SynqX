from abc import ABC, abstractmethod
from typing import Any, Dict, Iterator, List
import pandas as pd
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class BaseTransform(ABC):
    """
    Abstract Base Class for data transformations.
    Provides utility methods for robust DataFrame manipulation.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.on_chunk = config.get("_on_chunk")
        self.validate_config()

    @abstractmethod
    def validate_config(self) -> None:
        """
        Validate the configuration.
        """
        pass

    @abstractmethod
    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        """
        Apply transformation to the data stream.
        """
        pass

    def transform_multi(self, data_map: Dict[str, Iterator[pd.DataFrame]]) -> Iterator[pd.DataFrame]:
        """
        Apply transformation to multiple data streams.
        Supports streaming inputs. Operators that require full materialization (e.g. Join)
        must handle it internally.
        """
        raise NotImplementedError("Multi-input transformation not implemented for this operator.")

    def get_config_value(self, key: str, default: Any = None, required: bool = False) -> Any:
        val = self.config.get(key, default)
        if required and val is None:
            from synqx_core.errors import ConfigurationError
            raise ConfigurationError(f"Missing required configuration key: {key}")
        return val

    def ensure_columns(self, df: pd.DataFrame, columns: List[str]) -> bool:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            logger.warning(f"Missing expected columns in DataFrame: {missing}")
            return False
        return True
