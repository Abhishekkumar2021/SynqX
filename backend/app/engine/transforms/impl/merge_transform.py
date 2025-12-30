from typing import Dict, Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError
from app.core.logging import get_logger

logger = get_logger(__name__)

class MergeTransform(BaseTransform):
    """
    Merge Transform (Upsert Logic).
    Combines two datasets by updating existing records and adding new ones based on a key.
    
    Expects two inputs in transform_multi:
    - 'primary': The main dataset (usually the existing data/state)
    - 'delta': The new data to be merged in
    """

    def validate_config(self) -> None:
        if "on" not in self.config:
            raise ConfigurationError("MergeTransform requires an 'on' key (column name).")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        # Merge usually requires multiple inputs. Single input transform acts as no-op.
        return data

    def transform_multi(self, data_map: Dict[str, Iterator[pd.DataFrame]]) -> Iterator[pd.DataFrame]:
        """
        Merges delta records into primary records based on a shared key.
        """
        on_key = self.config.get("on")
        
        # In a streaming engine, Merge is tricky because it requires state.
        # For this implementation, we materialize the inputs for the current chunk set.
        
        # Extract inputs (handling potential multiple parents)
        # We look for aliases if provided, otherwise we take the first two inputs found.
        input_keys = list(data_map.keys())
        if len(input_keys) < 2:
            logger.warning("MergeTransform expects at least two input streams. Passing through first input.")
            if input_keys:
                yield from data_map[input_keys[0]]
            return

        # Simple strategy: Merge everything from stream 2 into stream 1
        primary_it = data_map[input_keys[0]]
        delta_it = data_map[input_keys[1]]
        
        # Collect all delta records first (small enough for memory usually)
        delta_df = pd.concat(list(delta_it), ignore_index=True) if delta_it else pd.DataFrame()
        
        if delta_df.empty:
            yield from primary_it
            return

        for primary_df in primary_it:
            if primary_df.empty:
                yield delta_df
                continue
                
            if on_key not in primary_df.columns or on_key not in delta_df.columns:
                logger.error(f"Merge key '{on_key}' not found in both datasets. Defaulting to Union.")
                yield pd.concat([primary_df, delta_df], ignore_index=True)
                continue

            # Upsert Logic:
            # 1. Remove rows from primary that exist in delta
            # 2. Append all rows from delta
            mask = primary_df[on_key].isin(delta_df[on_key])
            merged_df = pd.concat([primary_df[~mask], delta_df], ignore_index=True)
            
            yield merged_df
