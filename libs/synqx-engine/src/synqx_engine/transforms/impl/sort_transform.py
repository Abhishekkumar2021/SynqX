from collections.abc import Iterator

import polars as pl
from synqx_core.errors import ConfigurationError, TransformationError

from synqx_engine.transforms.polars_base import PolarsTransform


class SortTransform(PolarsTransform):
    """
    High-performance sorting using Polars.
    Config:
    - columns: List[str]
    - ascending: bool or List[bool]
    """

    def validate_config(self) -> None:
        if "columns" not in self.config:
            raise ConfigurationError("SortTransform requires 'columns'.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        columns = self.config["columns"]
        if isinstance(columns, dict):
            columns = list(columns.keys())

        descending = not self.config.get("ascending", True)

        # Sorting is a blocking operation
        try:
            lazy_frames = [df.lazy() for df in data]
            if not lazy_frames:
                return

            lf = pl.concat(lazy_frames)

            # Polars sort
            result_df = lf.sort(columns, descending=descending).collect()

            if self.on_chunk:
                import pandas as pd  # noqa: PLC0415

                self.on_chunk(pd.DataFrame(), direction="intermediate")

            yield result_df

        except Exception as e:
            raise TransformationError(f"Polars Sort failed: {e}") from e
