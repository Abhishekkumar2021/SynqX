from collections.abc import Iterator

import polars as pl
from synqx_core.errors import ConfigurationError

from synqx_engine.transforms.polars_base import PolarsTransform


class RegexReplaceTransform(PolarsTransform):
    """
    High-performance regex replacement using Polars.
    Config:
    - column: str
    - pattern: str
    - replacement: str
    """

    def validate_config(self) -> None:
        if not all(k in self.config for k in ["column", "pattern", "replacement"]):
            raise ConfigurationError(
                "RegexReplaceTransform requires 'column', 'pattern', and 'replacement'."
            )

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        column = self.config["column"]
        pattern = self.config["pattern"]
        replacement = self.config["replacement"]

        for df in data:
            if df.is_empty():
                yield df
                continue

            if column in df.columns:
                yield df.with_columns(
                    pl.col(column).cast(pl.Utf8).str.replace_all(pattern, replacement)
                )
            else:
                yield df
