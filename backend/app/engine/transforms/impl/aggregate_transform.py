from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.logging import get_logger

logger = get_logger(__name__)

class AggregateTransform(BaseTransform):
    """
    Groups data and calculates aggregates.
    Config:
    - group_by: List[str]
    - aggregates: Dict[str, str]  (e.g., {"salary": "mean", "id": "count"})
    """

    def validate_config(self) -> None:
        self.get_config_value("group_by", required=True)
        self.get_config_value("aggregates", required=True)

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        group_cols = self.config["group_by"]
        agg_map = self.config["aggregates"]
        
        # Accumulate ALL chunks into memory for blocking aggregation
        try:
            accumulated_df = pd.concat(list(data))
        except ValueError:
            # Empty sequence
            return
            
        if not accumulated_df.empty:
            valid_group_cols = [c for c in group_cols if c in accumulated_df.columns]
            if not valid_group_cols:
                 logger.error(f"None of the grouping columns {group_cols} found in data.")
                 return

            try:
                # Ensure agg columns exist
                valid_agg_map = {k: v for k, v in agg_map.items() if k in accumulated_df.columns}
                if not valid_agg_map:
                    logger.error(f"None of the aggregate columns {list(agg_map.keys())} found in data.")
                    return
                    
                result = accumulated_df.groupby(valid_group_cols).agg(valid_agg_map).reset_index()
                yield result
            except Exception as e:
                from app.core.errors import AppError
                raise AppError(f"Aggregation execution failed: {e}")
