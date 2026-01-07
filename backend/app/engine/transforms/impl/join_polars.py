from typing import Iterator, Dict
import polars as pl
from app.engine.transforms.polars_base import PolarsTransform
from app.core.logging import get_logger
from app.core.errors import ConfigurationError

logger = get_logger(__name__)

class JoinPolarsTransform(PolarsTransform):
    """
    High-performance Join using Polars.
    Config:
    - on: str (column name to join on)
    - how: str (left, inner, outer, cross, etc.)
    """

    def validate_config(self) -> None:
        if "on" not in self.config:
            raise ConfigurationError("JoinPolarsTransform requires 'on' column.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        raise NotImplementedError("JoinPolarsTransform requires multiple inputs. Use transform_multi instead.")

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        join_on = self.config["on"]
        how = self.config.get("how", "left")
        
        # In Polars, how names are slightly different: 'left', 'inner', 'outer', 'semi', 'anti', 'cross'
        # Pandas 'outer' is 'full' in newer Polars or 'outer' depending on version. 
        # We normalize 'outer' to 'full' for safety.
        polars_how = how if how != "outer" else "full"
        
        keys = list(data_map.keys())
        if len(keys) != 2:
            raise ConfigurationError(f"Join requires exactly 2 inputs, got {len(keys)}: {keys}")
        
        left_id, right_id = keys[0], keys[1]
        
        # 1. Materialize Right Side
        right_chunks = list(data_map[right_id])
        if not right_chunks:
            # Empty right side
            right_df = pl.DataFrame({join_on: []})
        else:
            right_df = pl.concat(right_chunks)
            
        # 2. Stream Left Side
        left_iter = data_map[left_id]
        
        for df in left_iter:
            if df.is_empty():
                yield df
                continue

            if join_on not in df.columns:
                logger.warning(f"Join column '{join_on}' not found in left input '{left_id}'.")
                yield df
                continue
            
            try:
                # Polars join handles suffixing via suffix parameter
                merged = df.join(right_df, on=join_on, how=polars_how, suffix="_right")
                yield merged
            except Exception as e:
                 raise ConfigurationError(f"Polars Join failed: {e}")
