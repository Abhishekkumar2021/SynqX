from typing import Iterator
import polars as pl
from engine.transforms.polars_base import PolarsTransform
from engine.core.errors import ConfigurationError, TransformationError

class FilterPolarsTransform(PolarsTransform):
    """
    High-performance row filtering using Polars on Remote Agent.
    """

    def validate_config(self) -> None:
        if "condition" not in self.config:
            raise ConfigurationError("FilterPolarsTransform requires 'condition' in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        condition = self.config["condition"]
        
        for df in data:
            if df.is_empty():
                yield df
                continue
                
            try:
                ctx = pl.SQLContext(frames={"input": df})
                filtered_df = ctx.execute(f"SELECT * FROM input WHERE {condition}").collect()
                
                if self.on_chunk:
                    filtered_count = len(df) - len(filtered_df)
                    if filtered_count > 0:
                        import pandas as pd
                        self.on_chunk(pd.DataFrame(), direction="intermediate", filtered_count=filtered_count)
                
                yield filtered_df
                
            except Exception as e:
                raise TransformationError(f"Polars Filter failed on agent: {e}") from e
