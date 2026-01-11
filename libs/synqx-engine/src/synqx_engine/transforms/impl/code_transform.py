from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import TransformationError

class CodeTransform(PolarsTransform):
    """
    Executes high-performance Python code using Polars Lazy API.
    Expects a function 'transform(lf: pl.LazyFrame) -> pl.LazyFrame'.
    """

    def validate_config(self) -> None:
        if "code" not in self.config:
            from synqx_core.errors import ConfigurationError
            raise ConfigurationError("CodeTransform requires 'code' in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        code = self.config["code"]
        
        # 1. Prepare local scope
        local_scope = {"pl": pl}
        try:
            exec(code, {}, local_scope)
            transform_fn = local_scope.get("transform")
            if not transform_fn:
                raise TransformationError("Polars code must define a 'transform(lf)' function.")
        except Exception as e:
            raise TransformationError(f"Failed to compile transform code: {e}")

        # 2. Execute on stream
        for df in data:
            if df.is_empty():
                yield df
                continue
                
            try:
                # Convert to LazyFrame for optimization
                lf = df.lazy()
                # Apply user logic
                result_lf = transform_fn(lf)
                # Collect back to DataFrame
                result_df = result_lf.collect()
                
                # Telemetry Update
                if self.on_chunk:
                    import pandas as pd
                    # Signal progress to the UI
                    self.on_chunk(pd.DataFrame(), direction="intermediate")
                
                yield result_df
            except Exception as e:
                raise TransformationError(f"Code execution failed: {e}")