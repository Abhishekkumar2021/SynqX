from abc import ABC, abstractmethod
from typing import Any, Dict, Iterator, List
import pandas as pd
from engine.core.logging import get_logger

logger = get_logger(__name__)

class BaseTransform(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.on_chunk = config.get("_on_chunk")
        self.validate_config()

    @abstractmethod
    def validate_config(self) -> None: pass

    @abstractmethod
    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]: pass

    def transform_multi(self, data_map: Dict[str, Iterator[pd.DataFrame]]) -> Iterator[pd.DataFrame]:
        raise NotImplementedError("Multi-input transformation not implemented for this operator.")

    def get_config_value(self, key: str, default: Any = None, required: bool = False) -> Any:
        val = self.config.get(key, default)
        if required and val is None:
            from engine.core.errors import ConfigurationError
            raise ConfigurationError(f"Missing required configuration key: {key}")
        return val

    def ensure_columns(self, df: pd.DataFrame, columns: List[str]) -> bool:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            logger.warning(f"Missing expected columns in DataFrame: {missing}")
            return False
        return True