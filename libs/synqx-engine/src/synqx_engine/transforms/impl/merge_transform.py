from typing import Dict, Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class MergeTransform(PolarsTransform):
    """
    High-performance Merge (Upsert) using Polars.
    Combines two datasets by updating existing records and adding new ones based on a key.
    
    Expects two inputs in transform_multi:
    - 'primary': The main dataset
    - 'delta': The new data to be merged in
    """

    def validate_config(self) -> None:
        if "on" not in self.config:
            raise ConfigurationError("MergeTransform requires an 'on' key (column name).")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        return data

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        on_key = self.config.get("on")
        input_keys = list(data_map.keys())
        
        if len(input_keys) < 2:
            if input_keys:
                yield from data_map[input_keys[0]]
            return

        primary_it = data_map[input_keys[0]]
        delta_it = data_map[input_keys[1]]
        
        # 1. Materialize Delta as a LazyFrame for efficient set operations
        delta_lfs = [df.lazy() for df in delta_it]
        if not delta_lfs:
            yield from primary_it
            return
            
        delta_lf = pl.concat(delta_lfs)
        
        # 2. Stream Primary and apply upsert logic
        for primary_df in primary_it:
            if primary_df.is_empty():
                continue
                
            # Upsert Logic:
            # Join primary against delta using 'anti' to get records ONLY in primary
            # Then concat with delta
            
            # Note: We need to materialize delta for the join usually, 
            # but we can do it once.
            delta_df = delta_lf.collect()
            
            # Anti-join to find records that are NOT being updated
            # Robustly handle if on_key is string or list
            stable_records = primary_df.join(delta_df, on=on_key, how="anti")
            
            # Combine stable records with all delta records
            merged_df = pl.concat([stable_records, delta_df])
            
            if self.on_chunk:
                import pandas as pd
                self.on_chunk(pd.DataFrame(), direction="intermediate")
                
            yield merged_df