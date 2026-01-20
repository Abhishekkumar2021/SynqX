from typing import Any


def is_df_empty(df: Any) -> bool:
    """
    Type-agnostic check for empty DataFrame (Polars, Pandas, or even lists/dicts).
    """
    if df is None:
        return True

    # Polars
    if hasattr(df, "is_empty"):
        return df.is_empty()

    # Pandas
    if hasattr(df, "empty"):
        return df.empty

    # Fallback for collections
    if hasattr(df, "__len__"):
        return len(df) == 0

    return True
