from typing import Iterator, List, Dict
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError

class DropColumnsTransform(PolarsTransform):
    """
    Drops specified columns from the DataFrame using Polars.
    Config:
    - columns: List[str] (e.g., ["column_to_drop_1", "column_to_drop_2"])
    """

    def validate_config(self) -> None:
        if "columns" not in self.config or not isinstance(self.config["columns"], list):
            raise ConfigurationError("DropColumnsTransform requires 'columns' as a list in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        cols_to_drop = self.config["columns"]
        for df in data:
            if df.is_empty():
                yield df
                continue
                
            # Only drop columns that actually exist in the DataFrame
            existing_cols = [col for col in cols_to_drop if col in df.columns]
            if existing_cols:
                yield df.drop(existing_cols)
            else:
                yield df

    def get_lineage_map(self, input_columns: List[str]) -> Dict[str, List[str]]:
        cols_to_drop = set(self.config.get("columns") or [])
        return {col: [col] for col in input_columns if col not in cols_to_drop}