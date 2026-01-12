from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError, TransformationError
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class AggregateTransform(PolarsTransform):
    """
    High-performance, memory-efficient aggregation using Polars.
    
    This implementation leverages Polars' Lazy API to allow for 
    potential streaming execution and optimal memory usage.
    """

    def validate_config(self) -> None:
        self.get_config_value("group_by", required=True)
        self.get_config_value("aggregates", required=True)

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        group_cols = self.config["group_by"]
        agg_map = self.config["aggregates"]
        
        if isinstance(group_cols, dict):
            # Fallback for UI-driven dictionary configs
            group_cols = list(group_cols.keys())
        
        # We must accumulate chunks for aggregation as it is a blocking operation,
        # but using Polars' concat and lazy execution is much faster and more 
        # memory-efficient than Pandas.
        
        try:
            # 1. Collect all chunks into a single LazyFrame
            # Note: For massive datasets, Polars can handle this better than Pandas
            # by not immediately materializing every single row in a heavy way.
            lazy_frames = [df.lazy() for df in data]
            if not lazy_frames:
                return
                
            lf = pl.concat(lazy_frames)
            
            # 2. Build the aggregation expressions
            agg_exprs = []
            for col, op in agg_map.items():
                if op == "sum":
                    agg_exprs.append(pl.col(col).sum())
                elif op == "mean" or op == "avg":
                    agg_exprs.append(pl.col(col).mean())
                elif op == "count":
                    agg_exprs.append(pl.col(col).count())
                elif op == "min":
                    agg_exprs.append(pl.col(col).min())
                elif op == "max":
                    agg_exprs.append(pl.col(col).max())
                elif op == "unique_count":
                    agg_exprs.append(pl.col(col).n_unique())
                else:
                    logger.warning(f"Unsupported aggregate operation '{op}' for column '{col}'. Skipping.")

            if not agg_exprs:
                raise ConfigurationError("No valid aggregate operations provided.")

            # 3. Execute the aggregation
            # Using collect() here. In a future iteration, we could use sink_parquet
            # if the final result itself is massive.
            # group_cols can be string or list
            result_df = lf.group_by(group_cols).agg(agg_exprs).collect()
            
            if self.on_chunk:
                import pandas as pd
                self.on_chunk(pd.DataFrame(), direction="intermediate")
                
            yield result_df
            
        except Exception as e:
            raise TransformationError(f"Polars Aggregation failed: {e}") from e