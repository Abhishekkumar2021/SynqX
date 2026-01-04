from typing import Iterator
import pandas as pd
import numpy as np
import json
from engine.transforms.base import BaseTransform

class CodeTransform(BaseTransform):
    """
    Executes a user-provided Python code snippet to transform the DataFrame.
    The code must define a function `transform(df: pd.DataFrame) -> pd.DataFrame`.
    """

    def validate_config(self) -> None:
        if "code" not in self.config:
            from engine.core.errors import ConfigurationError
            raise ConfigurationError("CodeTransform requires 'code' in config")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        code = self.config["code"]
        
        # Prepare a safe-ish scope
        local_scope = {
            "pd": pd,
            "np": np,
            "json": json
        }
        
        try:
            exec(code, {}, local_scope)
        except Exception as e:
            from engine.core.errors import ConfigurationError
            raise ConfigurationError(f"Failed to execute transform code: {e}") from e

        transform_func = local_scope.get("transform")
        if not transform_func or not callable(transform_func):
             from engine.core.errors import ConfigurationError
             raise ConfigurationError("Code must define a 'transform(df)' function")
        
        for df in data:
            try:
                yield transform_func(df)
            except Exception as e:
                from engine.core.errors import AppError
                raise AppError(f"Error during custom transform execution: {e}") from e
