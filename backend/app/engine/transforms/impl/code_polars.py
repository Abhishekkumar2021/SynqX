from typing import Iterator
import polars as pl
from app.engine.transforms.polars_base import PolarsTransform
from app.core.errors import TransformationError

class CodePolarsTransform(PolarsTransform):
    """
    Executes high-performance Python code using Polars Lazy API.
    Expects a function 'transform(lf: pl.LazyFrame) -> pl.LazyFrame'.
    """

    def validate_config(self) -> None:
        if "code" not in self.config:
            from app.core.errors import ConfigurationError
            raise ConfigurationError("CodePolarsTransform requires 'code' in config.")

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
            raise TransformationError(f"Failed to compile Polars transform: {e}")

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
                yield result_lf.collect()
            except Exception as e:
                raise TransformationError(f"Polars code execution failed: {e}")
