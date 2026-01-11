from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform

class MapTransform(PolarsTransform):
    """
    High-performance column manipulation using Polars.
    Config:
    - rename: Dict[str, str] (Optional)
    - drop: List[str] (Optional)
    """

    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        rename_map = self.config.get("rename")
        drop_cols = self.config.get("drop")

        for df in data:
            if df.is_empty():
                yield df
                continue
                
            if drop_cols:
                existing_drop = [c for c in drop_cols if c in df.columns]
                if existing_drop:
                    df = df.drop(existing_drop)
            
            if rename_map:
                # Polars rename only for existing columns
                safe_rename = {k: v for k, v in rename_map.items() if k in df.columns}
                if safe_rename:
                    df = df.rename(safe_rename)
            
            yield df