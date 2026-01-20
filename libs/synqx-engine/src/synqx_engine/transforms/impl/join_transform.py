from collections.abc import Iterator

import polars as pl
from synqx_core.errors import ConfigurationError, TransformationError
from synqx_core.logging import get_logger

from synqx_engine.transforms.polars_base import PolarsTransform

logger = get_logger(__name__)


class JoinTransform(PolarsTransform):
    """
    High-performance, memory-efficient Join using Polars Lazy API.
    """

    def validate_config(self) -> None:
        if "on" not in self.config:
            raise ConfigurationError("JoinTransform requires 'on' column.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        raise NotImplementedError(
            "JoinTransform requires multiple inputs. Use transform_multi instead."
        )

    def transform_multi(
        self, data_map: dict[str, Iterator[pl.DataFrame]]
    ) -> Iterator[pl.DataFrame]:
        join_on = self.config.get("on")
        left_on = self.config.get("left_on")
        right_on = self.config.get("right_on")
        how = self.config.get("how", "left")

        # Polars mapping
        polars_how = how if how != "outer" else "full"

        # Robustly handle different join configurations
        if isinstance(join_on, dict):
            left_on = list(join_on.keys())
            right_on = list(join_on.values())
            join_on = None

        keys = list(data_map.keys())
        if len(keys) != 2:  # noqa: PLR2004
            raise ConfigurationError(
                f"Join requires exactly 2 inputs, got {len(keys)}: {keys}"
            )

        left_id, right_id = keys[0], keys[1]

        try:
            # 1. Prepare Right Side
            right_lazy_list = [df.lazy() for df in data_map[right_id]]
            if not right_lazy_list:
                if polars_how == "inner":
                    return

                # Create empty schema-aware LazyFrame for the right side
                schema_cols = []
                if join_on:
                    schema_cols = [join_on] if isinstance(join_on, str) else join_on
                elif right_on:
                    schema_cols = [right_on] if isinstance(right_on, str) else right_on

                right_lf = pl.LazyFrame({c: [] for c in schema_cols})
            else:
                right_lf = pl.concat(right_lazy_list)

            # 2. Stream Left Side
            left_iter = data_map[left_id]

            for left_df in left_iter:
                if left_df.is_empty():
                    yield left_df
                    continue

                # Execute join with proper parameter mapping
                result_df = (
                    left_df.lazy()
                    .join(
                        right_lf,
                        on=join_on,
                        left_on=left_on,
                        right_on=right_on,
                        how=polars_how,
                        suffix="_right",
                    )
                    .collect()
                )

                if self.on_chunk:
                    import pandas as pd  # noqa: PLC0415

                    self.on_chunk(pd.DataFrame(), direction="intermediate")

                yield result_df

        except Exception as e:
            raise TransformationError(f"Join failed: {e}") from e

    def get_lineage_map_multi(
        self, input_schemas: dict[str, list[str]]
    ) -> dict[str, list[str]]:
        """
        Special override for multi-input operators.
        Returns Output Column -> List of (InputID, InputColumn)
        """
        lineage = {}
        for uid, columns in input_schemas.items():
            for col in columns:
                if col not in lineage:
                    lineage[col] = []
                lineage[col].append(f"{uid}.{col}")
        return lineage
