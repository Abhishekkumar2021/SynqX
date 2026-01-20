import hashlib
from collections.abc import Iterator
from typing import Any

import polars as pl
from synqx_core.errors import ConfigurationError, TransformationError

from synqx_engine.transforms.polars_base import PolarsTransform


class PIIMaskTransform(PolarsTransform):
    """
    High-performance PII Masking and Data Redaction using Polars.

    Supports various masking strategies:
    - redact: Replace entire value with a placeholder (e.g. [REDACTED])
    - partial: Show only first/last N characters
    - hash: Replace with a cryptographic hash (SHA-256)
    - regex: Use a regex pattern to find and replace

    Config:
    - masks: List[Dict]
        - column: str
        - strategy: 'redact' | 'partial' | 'hash' | 'regex'
        - placeholder: str (for redact)
        - pattern: str (for regex)
        - visible_chars: int (for partial)
    """

    def validate_config(self) -> None:
        if "masks" not in self.config or not isinstance(self.config["masks"], list):
            raise ConfigurationError(
                "PIIMaskTransform requires a list of 'masks' in config."
            )

    def _apply_mask(self, col: pl.Expr, rule: dict[str, Any]) -> pl.Expr:
        strategy = rule.get("strategy", "redact")

        if strategy == "redact":
            placeholder = rule.get("placeholder", "[REDACTED]")
            return pl.lit(placeholder)

        elif strategy == "hash":
            # Polars native hash or custom mapping
            # For simplicity and robustness, we cast to string then hash
            return col.cast(pl.Utf8).map_elements(
                lambda x: hashlib.sha256(str(x).encode()).hexdigest()
                if x is not None
                else None,
                return_dtype=pl.Utf8,
            )

        elif strategy == "partial":
            visible = rule.get("visible_chars", 4)
            # Show last N chars, mask the rest
            return col.cast(pl.Utf8).map_elements(
                lambda x: "*" * (len(str(x)) - visible) + str(x)[-visible:]
                if x is not None and len(str(x)) > visible
                else x,
                return_dtype=pl.Utf8,
            )

        elif strategy == "regex":
            pattern = rule.get("pattern")
            replacement = rule.get("replacement", "****")
            if pattern:
                return col.cast(pl.Utf8).str.replace_all(pattern, replacement)

        return col

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        masks = self.config["masks"]

        for df in data:
            if df.is_empty():
                yield df
                continue

            try:
                exprs = []
                for rule in masks:
                    col_name = rule.get("column")
                    if col_name in df.columns:
                        exprs.append(
                            self._apply_mask(pl.col(col_name), rule).alias(col_name)
                        )

                if exprs:
                    result_df = df.with_columns(exprs)
                else:
                    result_df = df

                if self.on_chunk:
                    import pandas as pd  # noqa: PLC0415

                    self.on_chunk(pd.DataFrame(), direction="intermediate")

                yield result_df

            except Exception as e:
                raise TransformationError(f"PII Masking failed: {e}") from e
