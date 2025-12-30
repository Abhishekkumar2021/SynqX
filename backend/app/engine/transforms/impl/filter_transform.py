from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError, TransformationError
from pandas.errors import UndefinedVariableError

class FilterTransform(BaseTransform):
    """
    Filters rows based on a query string.
    Config:
    - condition: str (e.g., "age > 30 and status == 'active'")
    """

    def validate_config(self) -> None:
        if "condition" not in self.config:
            raise ConfigurationError("FilterTransform requires 'condition' in config.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        condition = self.config["condition"]
        for df in data:
            if df.empty:
                yield df
                continue
            try:
                # Pandas query method is relatively safe for simple expressions
                yield df.query(condition)
            except UndefinedVariableError as e:
                raise TransformationError(f"Filter condition '{condition}' uses an undefined column: {e}. "
                                        "Please check if the column exists in the input data.") from e
            except Exception as e:
                # Wrap other pandas errors in our TransformationError
                raise TransformationError(f"Filter failed with condition '{condition}': {e}") from e