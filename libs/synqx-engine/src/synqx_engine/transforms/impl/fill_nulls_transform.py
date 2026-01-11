from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError, TransformationError

class FillNullsTransform(PolarsTransform):
    """
    High-performance null filling using Polars.
    Config:
    - value: Any (Value to fill nulls with) OR
    - strategy: str ('forward', 'backward', 'min', 'max', 'mean', 'zero', 'one')
    - subset: Optional[List[str]] (Columns to apply fill to)
    """

    def validate_config(self) -> None:
        value = self.get_config_value("value")
        strategy = self.get_config_value("strategy")
        if value is None and strategy is None:
            raise ConfigurationError("FillNullsTransform requires either 'value' or 'strategy'.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        value = self.config.get("value")
        strategy = self.config.get("strategy")
        subset = self.config.get("subset")
        
        # Strategy mapping from Pandas names to Polars
        strategy_map = {
            'ffill': 'forward',
            'bfill': 'backward',
            'mean': 'mean',
            'min': 'min',
            'max': 'max',
            'zero': 'zero',
            'one': 'one'
        }
        polars_strategy = strategy_map.get(strategy, strategy)

        for df in data:
            if df.is_empty():
                yield df
                continue
                
            try:
                if value is not None:
                    # Fill with specific value
                    result_df = df.fill_null(value=value)
                else:
                    # Fill with strategy
                    result_df = df.fill_null(strategy=polars_strategy)
                
                if self.on_chunk:
                    import pandas as pd
                    self.on_chunk(pd.DataFrame(), direction="intermediate")
                    
                yield result_df
            except Exception as e:
                raise TransformationError(f"Polars FillNulls failed: {e}") from e