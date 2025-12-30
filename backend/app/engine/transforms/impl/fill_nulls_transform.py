from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError
from app.core.logging import get_logger

logger = get_logger(__name__)

class FillNullsTransform(BaseTransform):
    """
    Fills null (NaN) values in the DataFrame.
    Config:
    - value: Any (Value to fill nulls with, e.g., 0, 'N/A', -1) OR
    - strategy: Literal['mean', 'median', 'mode', 'ffill', 'bfill'] (Method to fill nulls)
    - subset: Optional[List[str]] (Columns to apply fill to, default all)
    """

    def validate_config(self) -> None:
        value = self.get_config_value("value")
        strategy = self.get_config_value("strategy")
        if value is None and strategy is None:
            raise ConfigurationError("FillNullsTransform requires either 'value' or 'strategy'.")
        if value is not None and strategy is not None:
            raise ConfigurationError("FillNullsTransform cannot have both 'value' and 'strategy'.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        value = self.config.get("value")
        strategy = self.config.get("strategy")
        subset_cols = self.config.get("subset")

        for df in data:
            if df.empty:
                yield df
                continue
                
            target_cols = [col for col in subset_cols if col in df.columns] if subset_cols else df.columns

            try:
                if value is not None:
                    df[target_cols] = df[target_cols].fillna(value=value)
                elif strategy:
                    if strategy == 'mean':
                        df[target_cols] = df[target_cols].fillna(df[target_cols].mean(numeric_only=True))
                    elif strategy == 'median':
                        df[target_cols] = df[target_cols].fillna(df[target_cols].median(numeric_only=True))
                    elif strategy == 'mode':
                        mode_res = df[target_cols].mode()
                        if not mode_res.empty:
                            df[target_cols] = df[target_cols].fillna(mode_res.iloc[0])
                    elif strategy == 'ffill':
                        df[target_cols] = df[target_cols].ffill()
                    elif strategy == 'bfill':
                        df[target_cols] = df[target_cols].bfill()
            except Exception as e:
                logger.warning(f"Fill nulls failed for chunk: {e}")
                
            yield df
