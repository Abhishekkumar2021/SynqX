from abc import ABC, abstractmethod
from typing import Any, Dict, Iterator
import polars as pl
import logging

logger = logging.getLogger("SynqX-Agent-Executor")

class PolarsTransform(ABC):
    """
    Abstract Base Class for high-performance Polars-based transformations on Remote Agents.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.on_chunk = config.get("_on_chunk")
        self.validate_config()

    @abstractmethod
    def validate_config(self) -> None:
        pass

    @abstractmethod
    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        pass

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        raise NotImplementedError("Multi-input Polars transformation not implemented for this operator.")

    def get_config_value(self, key: str, default: Any = None, required: bool = False) -> Any:
        val = self.config.get(key, default)
        if required and val is None:
            from engine.core.errors import ConfigurationError
            raise ConfigurationError(f"Missing required configuration key: {key}")
        return val
