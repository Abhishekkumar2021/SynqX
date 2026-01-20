from abc import ABC, abstractmethod
from collections.abc import Iterator
from typing import Any

import pandas as pd
from synqx_core.logging import get_logger

logger = get_logger(__name__)


class BaseTransform(ABC):
    """
    Abstract Base Class for data transformations.
    Provides utility methods for robust DataFrame manipulation.
    """

    def __init__(self, config: dict[str, Any]):
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

    def get_lineage_map(self, input_columns: list[str]) -> dict[str, list[str]]:
        """
        Returns a mapping of Output Column -> List of Input Columns.
        Default implementation assumes identity mapping (pass-through).
        """
        return {col: [col] for col in input_columns}

    def transform_multi(
        self, data_map: dict[str, Iterator[pd.DataFrame]]
    ) -> Iterator[pd.DataFrame]:
        """
        Apply transformation to multiple data streams.
        Supports streaming inputs. Operators that require full materialization (e.g. Join)
        must handle it internally.
        """  # noqa: E501
        raise NotImplementedError(
            "Multi-input transformation not implemented for this operator."
        )

    def get_config_value(
        self, key: str, default: Any = None, required: bool = False
    ) -> Any:
        val = self.config.get(key, default)
        if required and val is None:
            from synqx_core.errors import ConfigurationError  # noqa: PLC0415

            raise ConfigurationError(f"Missing required configuration key: {key}")
        return val

    def ensure_columns(self, df: pd.DataFrame, columns: list[str]) -> bool:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            logger.warning(f"Missing expected columns in DataFrame: {missing}")
            return False
        return True
