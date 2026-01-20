import logging
import math
from typing import Any

import pandas as pd
import polars as pl
from synqx_core.utils.data import is_df_empty

logger = logging.getLogger("SynqX-Engine-Profiler")


class DataProfiler:
    """High-performance data profiling engine using Polars."""

    @staticmethod
    def profile_chunk(df: Any) -> dict[str, Any]:
        """Generate comprehensive stats for a data chunk."""
        if is_df_empty(df):
            return {}

        # Ensure we are in Polars for profiling
        if isinstance(df, pd.DataFrame):
            pdf = pl.from_pandas(df)
        else:
            pdf = df

        stats = {}
        try:
            # 1. Column-level Null analysis
            null_counts = pdf.null_count()

            for col in pdf.columns:
                col_stats = {
                    "null_count": int(null_counts[col][0]),
                    "dtype": str(pdf.schema[col]),
                }

                # 2. Numeric Analysis (Min, Max, Mean)
                if pdf.schema[col].is_numeric():

                    def safe_float(val):
                        if val is None:
                            return None
                        fval = float(val)
                        if math.isnan(fval) or math.isinf(fval):
                            return None
                        return fval

                    col_stats.update(
                        {
                            "min": safe_float(pdf[col].min()),
                            "max": safe_float(pdf[col].max()),
                            "mean": safe_float(pdf[col].mean()),
                        }
                    )

                stats[col] = col_stats

            logger.debug(
                f"Successfully profiled chunk with {len(pdf)} rows and {len(pdf.columns)} columns."  # noqa: E501
            )
        except Exception as e:
            logger.error(f"Profiling failed for chunk: {e}")

        return stats

    @staticmethod
    def merge_profiles(p1: dict, p2: dict) -> dict:
        """Merge stats from multiple chunks into a global step profile."""
        if not p1:
            return p2
        if not p2:
            return p1

        merged = {}
        all_cols = set(p1.keys()) | set(p2.keys())

        for col in all_cols:
            s1 = p1.get(col, {})
            s2 = p2.get(col, {})

            merged[col] = {
                "null_count": s1.get("null_count", 0) + s2.get("null_count", 0),
                "dtype": s1.get("dtype") or s2.get("dtype"),
            }

            # Numeric merging
            if "min" in s1 or "min" in s2:
                v_min = [v for v in [s1.get("min"), s2.get("min")] if v is not None]
                v_max = [v for v in [s1.get("max"), s2.get("max")] if v is not None]
                if v_min:
                    merged[col]["min"] = min(v_min)
                if v_max:
                    merged[col]["max"] = max(v_max)

                v_means = [v for v in [s1.get("mean"), s2.get("mean")] if v is not None]
                if v_means:
                    merged[col]["mean"] = sum(v_means) / len(v_means)

        return merged

    @staticmethod
    def check_guardrails(
        profile: dict, guardrails: list[dict], total_rows: int
    ) -> None:
        """
        Evaluate profile against a set of guardrail rules.
        Raises ValueError if any guardrail is violated.
        """
        if not guardrails or not profile or total_rows <= 0:
            return

        for gr in guardrails:
            col = gr.get("column")
            metric = gr.get("metric")  # e.g. "null_percentage", "min", "max"
            threshold = gr.get("threshold")
            operator = gr.get(
                "operator", "greater_than"
            )  # "greater_than", "less_than", "equal"

            if col not in profile:
                continue

            col_stats = profile[col]
            value = None

            if metric == "null_percentage":
                value = (col_stats.get("null_count", 0) / total_rows) * 100
            elif metric == "min":
                value = col_stats.get("min")
            elif metric == "max":
                value = col_stats.get("max")
            elif metric == "mean":
                value = col_stats.get("mean")

            if value is None:
                continue

            # Evaluate violation
            violated = False
            if operator == "greater_than":
                violated = value > threshold
            elif operator == "less_than":
                violated = value < threshold
            elif operator == "equal":
                violated = abs(value - threshold) < 1e-9  # noqa: PLR2004

            if violated:
                err_msg = f"GUARDRAIL BREACH: Column '{col}' {metric} is {value:.2f} (Threshold: {operator} {threshold})"  # noqa: E501
                logger.error(err_msg)
                raise ValueError(err_msg)
