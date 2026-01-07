from typing import Iterator
import polars as pl
from engine.transforms.polars_base import PolarsTransform
from engine.core.errors import TransformationError

class CodePolarsTransform(PolarsTransform):
    """
    High-performance custom logic using Polars on Remote Agent.
    """

    def validate_config(self) -> None:
        if "code" not in self.config:
            from engine.core.errors import ConfigurationError
            raise ConfigurationError("CodePolarsTransform requires 'code' in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        code = self.config["code"]
        local_scope = {"pl": pl}
        
        try:
            exec(code, {}, local_scope)
            transform_fn = local_scope.get("transform")
        except Exception as e:
            raise TransformationError(f"Failed to compile agent Polars transform: {e}")

        for df in data:
            if df.is_empty():
                yield df
                continue
            try:
                yield transform_fn(df.lazy()).collect()
            except Exception as e:
                raise TransformationError(f"Agent Polars code execution failed: {e}")
