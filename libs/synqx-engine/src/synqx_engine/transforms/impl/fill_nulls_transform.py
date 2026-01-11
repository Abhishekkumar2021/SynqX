from typing import Iterator
import pandas as pd
from synqx_engine.transforms.base import BaseTransform
from synqx_core.errors import ConfigurationError
from synqx_core.logging import get_logger

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

        if value is not None:
            # Streaming fill
            for df in data:
                if df.empty:
                    yield df
                    continue
                target_cols = [col for col in subset_cols if col in df.columns] if subset_cols else df.columns
                df[target_cols] = df[target_cols].fillna(value=value)
                yield df
        elif strategy in ['mean', 'median', 'mode']:
            # Blocking fill for statistical strategies
            all_chunks = list(data)
            if not all_chunks:
                return
            full_df = pd.concat(all_chunks, ignore_index=True)
            target_cols = [col for col in subset_cols if col in full_df.columns] if subset_cols else full_df.columns
            
            if strategy == 'mean':
                full_df[target_cols] = full_df[target_cols].fillna(full_df[target_cols].mean(numeric_only=True))
            elif strategy == 'median':
                full_df[target_cols] = full_df[target_cols].fillna(full_df[target_cols].median(numeric_only=True))
            elif strategy == 'mode':
                mode_res = full_df[target_cols].mode()
                if not mode_res.empty:
                    full_df[target_cols] = full_df[target_cols].fillna(mode_res.iloc[0])
            
            yield full_df
        else:
            # Streaming for ffill/bfill (local to chunk)
            for df in data:
                if df.empty:
                    yield df
                    continue
                target_cols = [col for col in subset_cols if col in df.columns] if subset_cols else df.columns
                if strategy == 'ffill':
                    df[target_cols] = df[target_cols].ffill()
                elif strategy == 'bfill':
                    df[target_cols] = df[target_cols].bfill()
                yield df
