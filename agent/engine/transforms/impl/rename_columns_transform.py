from typing import Iterator
import pandas as pd
from engine.transforms.base import BaseTransform
from engine.core.errors import ConfigurationError

class RenameColumnsTransform(BaseTransform):
    """
    Renames columns based on a provided mapping.
    Config:
    - rename_map: Dict[str, str] (e.g., {"old_name": "new_name"})
    """

    def validate_config(self) -> None:
        if "rename_map" not in self.config and "columns" not in self.config:
            raise ConfigurationError("RenameColumnsTransform requires 'rename_map' or 'columns' as a dictionary in config.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        rename_map = self.config.get("rename_map") or self.config.get("columns")
        for df in data:
            yield df.rename(columns=rename_map)
