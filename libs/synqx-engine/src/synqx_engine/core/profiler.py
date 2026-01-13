import pandas as pd
import polars as pl
import math
import logging
from typing import Dict, Any, Optional
from synqx_core.utils.data import is_df_empty

logger = logging.getLogger("SynqX-Engine-Profiler")

class DataProfiler:
    """High-performance data profiling engine using Polars."""
    
    @staticmethod
    def profile_chunk(df: Any) -> Dict[str, Any]:
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
                    "dtype": str(pdf.schema[col])
                }
                
                # 2. Numeric Analysis (Min, Max, Mean)
                if pdf.schema[col].is_numeric():
                    def safe_float(val):
                        if val is None: return None
                        fval = float(val)
                        if math.isnan(fval) or math.isinf(fval): return None
                        return fval

                    col_stats.update({
                        "min": safe_float(pdf[col].min()),
                        "max": safe_float(pdf[col].max()),
                        "mean": safe_float(pdf[col].mean()),
                    })
                
                stats[col] = col_stats
            
            logger.debug(f"Successfully profiled chunk with {len(pdf)} rows and {len(pdf.columns)} columns.")
        except Exception as e:
            logger.error(f"Profiling failed for chunk: {e}")
            
        return stats

    @staticmethod
    def merge_profiles(p1: Dict, p2: Dict) -> Dict:
        """Merge stats from multiple chunks into a global step profile."""
        if not p1: return p2
        if not p2: return p1
        
        merged = {}
        all_cols = set(p1.keys()) | set(p2.keys())
        
        for col in all_cols:
            s1 = p1.get(col, {})
            s2 = p2.get(col, {})
            
            merged[col] = {
                "null_count": s1.get("null_count", 0) + s2.get("null_count", 0),
                "dtype": s1.get("dtype") or s2.get("dtype")
            }
            
            # Numeric merging
            if "min" in s1 or "min" in s2:
                v_min = [v for v in [s1.get("min"), s2.get("min")] if v is not None]
                v_max = [v for v in [s1.get("max"), s2.get("max")] if v is not None]
                if v_min: merged[col]["min"] = min(v_min)
                if v_max: merged[col]["max"] = max(v_max)
                
        return merged