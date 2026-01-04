from typing import Iterator
import pandas as pd
from engine.transforms.base import BaseTransform
from engine.core.errors import ConfigurationError

class TypeCastTransform(BaseTransform):
    """
    Casts columns to specified data types.
    Config:
    - casts: Dict[str, str] (e.g., {"id": "int", "price": "float", "is_active": "bool"})
    """

    def validate_config(self) -> None:
        if "casts" not in self.config:
            raise ConfigurationError("TypeCastTransform requires 'casts' in config.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        cast_map = self.config["casts"]

        for df in data:
            if df.empty:
                yield df
                continue
                
            for col, dtype in cast_map.items():
                if col in df.columns:
                    try:
                        if dtype == 'datetime':
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                        else:
                            df[col] = df[col].astype(dtype)
                    except Exception:
                        # Log warning or handle error
                        pass
            yield df
