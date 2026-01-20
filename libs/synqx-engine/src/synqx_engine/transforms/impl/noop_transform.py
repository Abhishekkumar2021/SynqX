from collections.abc import Iterator

import polars as pl

from synqx_engine.transforms.polars_base import PolarsTransform


class NoOpTransform(PolarsTransform):
    """
    Pass-through transform that does nothing to the data.
    Maintains Polars context to avoid conversion overhead.
    """

    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        yield from data
