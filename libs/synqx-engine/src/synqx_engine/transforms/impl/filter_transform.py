from collections.abc import Iterator

import polars as pl
from synqx_core.errors import ConfigurationError, TransformationError

from synqx_engine.transforms.polars_base import PolarsTransform


class FilterTransform(PolarsTransform):
    """
    High-performance row filtering using Polars.
    Expects conditions in Polars SQL or expression-like syntax.
    """

    def validate_config(self) -> None:
        if "condition" not in self.config:
            raise ConfigurationError("FilterTransform requires 'condition' in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        condition = self.config["condition"]

        for df in data:
            if df.is_empty():
                yield df
                continue

            try:
                # Use Polars SQL for familiar syntax
                ctx = pl.SQLContext(frames={"input": df})
                filtered_df = ctx.execute(
                    f"SELECT * FROM input WHERE {condition}"
                ).collect()

                if self.on_chunk:
                    filtered_count = len(df) - len(filtered_df)
                    if filtered_count > 0:
                        import pandas as pd  # noqa: PLC0415

                        self.on_chunk(
                            pd.DataFrame(),
                            direction="intermediate",
                            filtered_count=filtered_count,
                        )

                yield filtered_df

            except Exception as e:
                raise TransformationError(
                    f"Filter failed with condition '{condition}': {e}"
                ) from e
