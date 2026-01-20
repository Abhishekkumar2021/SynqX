from collections.abc import Iterator

import polars as pl

from synqx_engine.transforms.polars_base import PolarsTransform


class UnionTransform(PolarsTransform):
    """
    Combines multiple Polars data streams vertically (concatenation).
    Streams inputs sequentially to keep memory usage low.
    """

    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        # Single input pass-through
        yield from data

    def transform_multi(
        self, data_map: dict[str, Iterator[pl.DataFrame]]
    ) -> Iterator[pl.DataFrame]:
        # Stream each input sequentially
        # This is the most memory-efficient way to union large datasets
        for iterator in data_map.values():
            for df in iterator:
                if self.on_chunk:
                    import pandas as pd  # noqa: PLC0415

                    self.on_chunk(pd.DataFrame(), direction="intermediate")
                yield df
