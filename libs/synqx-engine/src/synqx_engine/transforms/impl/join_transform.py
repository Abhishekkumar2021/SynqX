from typing import Iterator, Dict
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.logging import get_logger
from synqx_core.errors import ConfigurationError, TransformationError

logger = get_logger(__name__)

class JoinTransform(PolarsTransform):
    """
    High-performance, memory-efficient Join using Polars Lazy API.
    """

    def validate_config(self) -> None:
        if "on" not in self.config:
            raise ConfigurationError("JoinTransform requires 'on' column.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        raise NotImplementedError("JoinTransform requires multiple inputs. Use transform_multi instead.")

    def transform_multi(self, data_map: Dict[str, Iterator[pl.DataFrame]]) -> Iterator[pl.DataFrame]:
        join_on = self.config["on"]
        how = self.config.get("how", "left")
        
        polars_how = how if how != "outer" else "full"
        
        keys = list(data_map.keys())
        if len(keys) != 2:
            raise ConfigurationError(f"Join requires exactly 2 inputs, got {len(keys)}: {keys}")
        
        left_id, right_id = keys[0], keys[1]
        
        try:
            # 1. Prepare Right Side
            right_lazy_list = [df.lazy() for df in data_map[right_id]]
            if not right_lazy_list:
                if polars_how == "inner":
                    return
                right_lf = pl.LazyFrame({join_on: []})
            else:
                right_lf = pl.concat(right_lazy_list)

            # 2. Stream Left Side
            left_iter = data_map[left_id]
            
            for left_df in left_iter:
                if left_df.is_empty():
                    yield left_df
                    continue

                result_df = left_df.lazy().join(
                    right_lf, 
                    on=join_on, 
                    how=polars_how, 
                    suffix="_right"
                ).collect()
                
                if self.on_chunk:
                    import pandas as pd
                    self.on_chunk(pd.DataFrame(), direction="intermediate")
                    
                yield result_df
                
        except Exception as e:
             raise TransformationError(f"Join failed: {e}") from e
