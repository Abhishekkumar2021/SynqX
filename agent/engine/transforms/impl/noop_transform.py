from typing import Iterator
import pandas as pd
from engine.transforms.base import BaseTransform

class NoOpTransform(BaseTransform):
    """
    Pass-through transform that does nothing to the data.
    Useful for testing or as a placeholder.
    """
    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        yield from data
