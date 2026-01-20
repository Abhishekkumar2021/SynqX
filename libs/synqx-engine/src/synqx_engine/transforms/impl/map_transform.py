from collections.abc import Iterator

import polars as pl

from synqx_engine.transforms.polars_base import PolarsTransform


class MapTransform(PolarsTransform):
    """
    High-performance column manipulation using Polars.
    Config:
    - rename: Dict[str, str] (Optional)
    - drop: List[str] (Optional)
    """

    def validate_config(self) -> None:
        pass

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        rename_map = self.config.get("rename")
        drop_cols = self.config.get("drop")

        for df in data:
            if df.is_empty():
                yield df
                continue

            if drop_cols:
                existing_drop = [c for c in drop_cols if c in df.columns]
                if existing_drop:
                    df = df.drop(existing_drop)  # noqa: PLW2901

            if rename_map:
                # Polars rename only for existing columns
                # Pandas would ignore missing, but Polars raises error
                safe_rename = {k: v for k, v in rename_map.items() if k in df.columns}
                if safe_rename:
                    df = df.rename(safe_rename)  # noqa: PLW2901

            yield df

    def get_lineage_map(self, input_columns: list[str]) -> dict[str, list[str]]:
        rename_map = self.config.get("rename") or {}
        drop_cols = set(self.config.get("drop") or [])

        lineage = {}
        for col in input_columns:
            if col in drop_cols:
                continue
            new_name = rename_map.get(col, col)
            lineage[new_name] = [col]
        return lineage
