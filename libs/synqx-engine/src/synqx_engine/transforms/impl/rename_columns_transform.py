from typing import Iterator, List, Dict
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError

class RenameColumnsTransform(PolarsTransform):
    """
    Renames columns using Polars.
    Config:
    - rename_map: Dict[str, str] (e.g., {"old_name": "new_name"})
    """

    def validate_config(self) -> None:
        if "rename_map" not in self.config and "columns" not in self.config:
            raise ConfigurationError("RenameColumnsTransform requires 'rename_map' or 'columns' as a dictionary in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        rename_map = self.config.get("rename_map") or self.config.get("columns")
        for df in data:
            if df.is_empty():
                yield df
                continue
            
            # Polars rename only handles columns that exist
            safe_map = {k: v for k, v in rename_map.items() if k in df.columns}
            if safe_map:
                yield df.rename(safe_map)
            else:
                yield df

    def get_lineage_map(self, input_columns: List[str]) -> Dict[str, List[str]]:
        rename_map = self.config.get("rename_map") or self.config.get("columns") or {}
        lineage = {}
        for col in input_columns:
            # If renamed, output points to input
            new_name = rename_map.get(col, col)
            lineage[new_name] = [col]
        return lineage