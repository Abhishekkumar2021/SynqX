from typing import Iterator, Dict
import polars as pl
from datetime import datetime, timezone
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError, TransformationError
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class SCDType2Transform(PolarsTransform):
    """
    High-performance Slowly Changing Dimension (SCD) Type 2 logic using Polars.
    
    Tracks historical changes by maintaining versioned rows with:
    - effective_from: When this version became active
    - effective_to: When this version was superseded (null if current)
    - is_current: Boolean flag for the latest version
    
    Config:
    - primary_key: List[str] (Columns that uniquely identify an entity)
    - compare_columns: List[str] (Columns to check for changes)
    - effective_from_col: str (Default: 'synqx_effective_from')
    - effective_to_col: str (Default: 'synqx_effective_to')
    - is_current_col: str (Default: 'synqx_is_current')
    """

    def validate_config(self) -> None:
        self.get_config_value("primary_key", required=True)
        self.get_config_value("compare_columns", required=True)

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        # SCD Type 2 is inherently stateful and requires comparing new data (delta)
        # against existing data (target/history).
        # In this transform, we expect 'data' to be the delta stream.
        # The 'target' state must be provided via transform_multi or external lookup.
        # For simplicity in this single-input transform, we'll act as a 'delta generator'
        # or error out if context is missing.
        raise NotImplementedError("SCD Type 2 requires a 'target' input. Use transform_multi.")

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        """
        Expects:
        - 'delta': New incoming records
        - 'target': Existing historical records (optional, if empty assumes first run)
        """
        pk = self.config["primary_key"]
        compare_cols = self.config["compare_columns"]
        
        eff_from = self.config.get("effective_from_col", "synqx_effective_from")
        eff_to = self.config.get("effective_to_col", "synqx_effective_to")
        is_curr = self.config.get("is_current_col", "synqx_is_current")
        
        now = datetime.now(timezone.utc)

        # 1. Materialize Delta
        delta_lfs = [df.lazy() for df in data_map.get("delta", []) or data_map.get("primary", [])]
        if not delta_lfs:
            return
        delta_lf = pl.concat(delta_lfs).unique(subset=pk)

        # 2. Materialize Target (only current records)
        target_lfs = [df.lazy() for df in data_map.get("target", []) or data_map.get("secondary", [])]
        if not target_lfs:
            # First run: All deltas are new current records
            result = delta_lf.with_columns([
                pl.lit(now).alias(eff_from),
                pl.lit(None, dtype=pl.Datetime).alias(eff_to),
                pl.lit(True).alias(is_curr)
            ]).collect()
            yield result
            return

        target_lf = pl.concat(target_lfs).filter(pl.col(is_curr) == True)
        
        try:
            # Join delta and target to find:
            # - New records (not in target)
            # - Changed records (in both, but compare_cols differ)
            # - Unchanged records (in both, identical)
            
            combined = delta_lf.join(
                target_lf, 
                on=pk, 
                how="full", 
                suffix="_target"
            )

            # --- A. Identify New Records ---
            # Rows where target is null
            new_records = combined.filter(
                pl.col(is_curr).is_null()
            ).select(delta_lf.columns).with_columns([
                pl.lit(now).alias(eff_from),
                pl.lit(None, dtype=pl.Datetime).alias(eff_to),
                pl.lit(True).alias(is_curr)
            ])

            # --- B. Identify Changed Records ---
            # Rows in both where any compare_col differs
            change_conditions = []
            for col in compare_cols:
                change_conditions.append(pl.col(col) != pl.col(f"{col}_target"))
            
            has_changed = pl.any_horizontal(change_conditions)
            
            # 1. The new version of changed records
            changed_new = combined.filter(
                pl.col(is_curr).is_not_null() & pl.col(is_curr).is_not_null() & has_changed
            ).select(delta_lf.columns).with_columns([
                pl.lit(now).alias(eff_from),
                pl.lit(None, dtype=pl.Datetime).alias(eff_to),
                pl.lit(True).alias(is_curr)
            ])

            # 2. The old version to be closed
            changed_old = combined.filter(
                pl.col(is_curr).is_not_null() & has_changed
            ).select([pl.col(f"{c}_target").alias(c) for c in target_lf.columns]).with_columns([
                pl.lit(now).alias(eff_to),
                pl.lit(False).alias(is_curr)
            ])

            # --- C. Final Output ---
            # Union all: New records + New versions + Closed old versions
            # Note: We don't yield unchanged records as they stay as-is in the target table
            final_df = pl.concat([new_records, changed_new, changed_old]).collect()
            
            if self.on_chunk:
                import pandas as pd
                self.on_chunk(pd.DataFrame(), direction="intermediate")
                
            yield final_df

        except Exception as e:
            raise TransformationError(f"SCD Type 2 execution failed: {e}") from e
