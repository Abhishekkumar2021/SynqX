from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError

class TypeCastTransform(PolarsTransform):
    """
    Casts columns to specified Polars data types.
    Config:
    - casts: Dict[str, str] (e.g., {"id": "int", "price": "float", "is_active": "bool"})
    """

    def validate_config(self) -> None:
        if "casts" not in self.config:
            raise ConfigurationError("TypeCastTransform requires 'casts' in config.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        cast_map = self.config["casts"]
        
        # Mapping standard types to Polars types
        type_map = {
            "int": pl.Int64,
            "float": pl.Float64,
            "bool": pl.Boolean,
            "string": pl.Utf8,
            "str": pl.Utf8,
            "datetime": pl.Datetime,
            "date": pl.Date
        }

        for df in data:
            if df.is_empty():
                yield df
                continue
            
            exprs = []
            for col, dtype_name in cast_map.items():
                if col in df.columns:
                    pl_type = type_map.get(dtype_name.lower(), pl.Utf8)
                    exprs.append(pl.col(col).cast(pl_type))
            
            if exprs:
                yield df.with_columns(exprs)
            else:
                yield df