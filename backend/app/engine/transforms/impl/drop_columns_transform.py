from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError

class DropColumnsTransform(BaseTransform):
    """
    Drops specified columns from the DataFrame.
    Config:
    - columns: List[str] (e.g., ["column_to_drop_1", "column_to_drop_2"])
    """

    def validate_config(self) -> None:
        if "columns" not in self.config or not isinstance(self.config["columns"], list):
            raise ConfigurationError("DropColumnsTransform requires 'columns' as a list in config.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        cols_to_drop = self.config["columns"]
        for df in data:
            # Only drop columns that actually exist in the DataFrame
            existing_cols = [col for col in cols_to_drop if col in df.columns]
            if existing_cols:
                yield df.drop(columns=existing_cols)
            else:
                yield df # No columns to drop, return original DF
