from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError
from app.core.logging import get_logger

logger = get_logger(__name__)

class DeduplicateTransform(BaseTransform):
    """
    Removes duplicate rows from the DataFrame.
    Config:
    - subset: Optional[List[str]] (Columns to consider for identifying duplicates, default all)
    - keep: str (Which duplicate to keep: 'first', 'last', or False to drop all duplicates)
    """

    def validate_config(self) -> None:
        keep = self.get_config_value("keep", "first")
        if keep not in ["first", "last", False]:
            raise ConfigurationError("DeduplicateTransform 'keep' must be 'first', 'last', or False.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        subset = self.config.get("subset")
        keep = self.config.get("keep", "first")

        for df in data:
            if df.empty:
                yield df
                continue
                
            # Filter subset columns that actually exist
            valid_subset = [col for col in subset if col in df.columns] if subset else None
            
            try:
                yield df.drop_duplicates(subset=valid_subset, keep=keep)
            except Exception as e:
                logger.warning(f"Deduplication failed for chunk: {e}")
                yield df
