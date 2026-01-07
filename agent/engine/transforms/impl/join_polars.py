from typing import Iterator, Dict
import polars as pl
import logging
from engine.transforms.polars_base import PolarsTransform
from engine.core.errors import ConfigurationError

logger = logging.getLogger("SynqX-Agent-Executor")

class JoinPolarsTransform(PolarsTransform):
    """
    High-performance Join using Polars on Remote Agent.
    """

    def validate_config(self) -> None:
        if "on" not in self.config:
            raise ConfigurationError("JoinPolarsTransform requires 'on' column.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        raise NotImplementedError("JoinPolarsTransform requires multiple inputs.")

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        join_on = self.config["on"]
        how = self.config.get("how", "left")
        polars_how = how if how != "outer" else "full"
        
        keys = list(data_map.keys())
        if len(keys) != 2:
            raise ConfigurationError(f"Join requires exactly 2 inputs, got {len(keys)}")
        
        left_id, right_id = keys[0], keys[1]
        
        right_chunks = list(data_map[right_id])
        if not right_chunks:
            right_df = pl.DataFrame({join_on: []})
        else:
            right_df = pl.concat(right_chunks)
            
        left_iter = data_map[left_id]
        
        for df in left_iter:
            if df.is_empty():
                yield df
                continue
            
            try:
                merged = df.join(right_df, on=join_on, how=polars_how, suffix="_right")
                yield merged
            except Exception as e:
                 raise ConfigurationError(f"Polars Join failed on agent: {e}")
