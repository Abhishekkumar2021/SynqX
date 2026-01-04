from typing import Iterator
import pandas as pd
from engine.transforms.base import BaseTransform
from engine.core.errors import ConfigurationError

class PandasTransform(BaseTransform):
    """
    Applies basic Pandas operations based on configuration.
    Supported operations:
    - drop_columns: List[str]
    - rename_columns: Dict[str, str]
    - filter_query: str (e.g. "age > 30")
    """

    def validate_config(self) -> None:
        # Optional validation logic
        pass

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        for df in data:
            # 1. Drop Columns
            drop_cols = self.config.get("drop_columns")
            if drop_cols:
                # Only drop columns that exist
                existing_cols = [c for c in drop_cols if c in df.columns]
                if existing_cols:
                    df = df.drop(columns=existing_cols)
            
            # 2. Rename Columns
            rename_map = self.config.get("rename_columns")
            if rename_map:
                df = df.rename(columns=rename_map)

            # 3. Filter
            filter_query = self.config.get("filter_query")
            if filter_query:
                try:
                    df = df.query(filter_query)
                except Exception as e:
                    # Log warning or raise error? For now, re-raise to fail the step
                    raise ConfigurationError(f"Invalid filter query '{filter_query}': {e}") from e
            
            yield df
