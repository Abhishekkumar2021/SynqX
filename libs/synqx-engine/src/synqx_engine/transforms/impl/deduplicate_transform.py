from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import TransformationError

class DeduplicateTransform(PolarsTransform):
    """
    High-performance deduplication using Polars.
    Config:
    - columns: List[str] (columns to consider for uniqueness, default: all)
    - keep: str (first, last, any - default: first)
    """

    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        subset = self.config.get("columns") or self.config.get("subset")
        keep = self.config.get("keep", "first")
        
        try:
            lazy_frames = [df.lazy() for df in data]
            if not lazy_frames:
                return
                
            lf = pl.concat(lazy_frames)
            result_df = lf.unique(subset=subset, keep=keep, maintain_order=True).collect()
            
            if self.on_chunk:
                import pandas as pd
                self.on_chunk(pd.DataFrame(), direction="intermediate")
                
            yield result_df
            
        except Exception as e:
            raise TransformationError(f"Deduplication failed: {e}") from e