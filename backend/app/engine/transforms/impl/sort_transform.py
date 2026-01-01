from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError

class SortTransform(BaseTransform):
    """
    Sorts data.
    Config:
    - columns: List[str]
    - ascending: bool or List[bool]
    """

    def validate_config(self) -> None:
        if "columns" not in self.config:
            raise ConfigurationError("SortTransform requires 'columns'.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        columns = self.config["columns"]
        ascending = self.config.get("ascending", True)
        
        # Blocking: Accumulate everything then sort
        all_chunks = list(data)
        if not all_chunks:
            return
            
        full_df = pd.concat(all_chunks, ignore_index=True)
        yield full_df.sort_values(by=columns, ascending=ascending)
