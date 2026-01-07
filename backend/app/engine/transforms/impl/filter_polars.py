from typing import Iterator
import polars as pl
from app.engine.transforms.polars_base import PolarsTransform
from app.core.errors import ConfigurationError, TransformationError

class FilterPolarsTransform(PolarsTransform):
    """
    High-performance row filtering using Polars.
    Expects conditions in Polars SQL or expression-like syntax.
    
    NOTE: For simplicity in the UI, we currently support simple column comparison strings.
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
                # PERFORMANCE: Polars lazy evaluation or direct filter
                # Simple condition parsing (e.g. "age > 30")
                # For advanced conditions, we would ideally use pl.Expr
                # But for parity with pandas .query(), we can use a basic interpreter 
                # or encourage Polars-native syntax.
                
                # Use Polars SQL for familiar syntax
                ctx = pl.SQLContext(frames={"input": df})
                filtered_df = ctx.execute(f"SELECT * FROM input WHERE {condition}").collect()
                
                if self.on_chunk:
                    filtered_count = len(df) - len(filtered_df)
                    if filtered_count > 0:
                        # Pass an empty df to trigger telemetry update
                        import pandas as pd
                        self.on_chunk(pd.DataFrame(), direction="intermediate", filtered_count=filtered_count)
                
                yield filtered_df
                
            except Exception as e:
                raise TransformationError(f"Polars Filter failed with condition '{condition}': {e}") from e
