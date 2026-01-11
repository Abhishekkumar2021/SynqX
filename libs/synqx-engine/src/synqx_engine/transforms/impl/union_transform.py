from typing import Iterator, Dict
import pandas as pd
from synqx_engine.transforms.base import BaseTransform

class UnionTransform(BaseTransform):
    """
    Combines multiple data streams vertically (concatenation).
    Streams inputs sequentially to keep memory usage low.
    """

    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        # Single input pass-through
        yield from data

    def transform_multi(self, data_map: Dict[str, Iterator[pd.DataFrame]]) -> Iterator[pd.DataFrame]:
        # Stream each input sequentially
        for iterator in data_map.values():
            yield from iterator
