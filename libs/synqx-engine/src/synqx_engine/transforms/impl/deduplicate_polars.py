from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class DeduplicatePolarsTransform(PolarsTransform):
    """
    High-performance deduplication using Polars.
    Config:
    - subset: Optional[List[str]] (Columns to consider)
    - keep: str ('first', 'last')
    """

    def validate_config(self) -> None:
        keep = self.config.get("keep", "first")
        if keep not in ["first", "last", False]:
            raise ConfigurationError("DeduplicatePolarsTransform 'keep' must be 'first', 'last', or False.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        subset = self.config.get("subset")
        keep = self.config.get("keep", "first")

        # Global deduplication requires materialization
        all_chunks = list(data)
        if not all_chunks:
            return
            
        full_df = pl.concat(all_chunks)
        
        # Filter subset columns that actually exist
        valid_subset = [col for col in subset if col in full_df.columns] if subset else None
        
        try:
            # Polars unique method
            # maintain_order=True is safer for user expectations but slightly slower
            dedup_df = full_df.unique(subset=valid_subset, keep=keep, maintain_order=True)
            
            if self.on_chunk:
                filtered_count = len(full_df) - len(dedup_df)
                if filtered_count > 0:
                    import pandas as pd
                    self.on_chunk(pd.DataFrame(), direction="intermediate", filtered_count=filtered_count)
            
            yield dedup_df
        except Exception as e:
            logger.warning(f"Polars Deduplication failed: {e}")
            yield full_df
