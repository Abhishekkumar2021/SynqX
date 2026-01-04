from typing import Iterator
import pandas as pd
from engine.transforms.base import BaseTransform

class MapTransform(BaseTransform):
    """
    Renames or drops columns.
    Config:
    - rename: Dict[str, str] (Optional)
    - drop: List[str] (Optional)
    """

    def validate_config(self) -> None:
        # No strict validation needed, keys are optional
        pass

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        rename_map = self.config.get("rename")
        drop_cols = self.config.get("drop")

        for df in data:
            if drop_cols:
                # Only drop columns that exist to avoid errors
                existing_drop = [c for c in drop_cols if c in df.columns]
                if existing_drop:
                    df = df.drop(columns=existing_drop)
            
            if rename_map:
                df = df.rename(columns=rename_map)
            
            yield df
