from typing import Iterator
import polars as pl
import logging
from engine.transforms.polars_base import PolarsTransform
from engine.core.errors import ConfigurationError

logger = logging.getLogger("SynqX-Agent-Executor")

class DeduplicatePolarsTransform(PolarsTransform):
    """
    High-performance deduplication using Polars on Remote Agent.
    """

    def validate_config(self) -> None:
        keep = self.config.get("keep", "first")
        if keep not in ["first", "last", False]:
            raise ConfigurationError("DeduplicatePolarsTransform 'keep' must be 'first', 'last', or False.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        subset = self.config.get("subset")
        keep = self.config.get("keep", "first")

        all_chunks = list(data)
        if not all_chunks:
            return
            
        full_df = pl.concat(all_chunks)
        valid_subset = [col for col in subset if col in full_df.columns] if subset else None
        
        try:
            dedup_df = full_df.unique(subset=valid_subset, keep=keep, maintain_order=True)
            if self.on_chunk:
                import pandas as pd
                self.on_chunk(pd.DataFrame(), direction="intermediate", filtered_count=len(full_df) - len(dedup_df))
            yield dedup_df
        except Exception as e:
            logger.warning(f"Polars Deduplication failed on agent: {e}")
            yield full_df
