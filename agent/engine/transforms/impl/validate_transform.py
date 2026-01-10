from typing import Iterator
import pandas as pd
import numpy as np
from engine.transforms.base import BaseTransform
from engine.core.errors import ConfigurationError, PipelineExecutionError
from engine.core.logging import get_logger

# Note: Alerting is handled by the Control Plane via the on_chunk_cb reporting errors.
# Direct imports of app.* services are removed to ensure remote agent independence.

logger = get_logger(__name__)

class ValidateTransform(BaseTransform):
    """
    Data Quality & Contract Enforcement Transform (Remote Agent Sync).
    
    Features:
    - Schema Drift Detection: Identifies missing or unexpected columns.
    - Statistical Contracts: Terminate if failures > X% or > N rows.
    - Deep Quarantine: Adds error metadata to diverted rows.
    """

    def validate_config(self) -> None:
        if "schema" not in self.config:
            raise ConfigurationError("ValidateTransform requires a 'schema' configuration.")
        
        rules = self.config.get("schema")
        if not isinstance(rules, list):
            raise ConfigurationError("'schema' must be a list of validation rules.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        # 1. Load Contract Config
        rules = self.config.get("schema", [])
        strict = self.config.get("strict", False)
        allow_drift = self.config.get("allow_extra_columns", True)
        
        # 2. Thresholds
        error_threshold_pct = self.config.get("error_threshold_percent", 100.0)
        error_threshold_rows = self.config.get("error_threshold_rows", 0)
        
        # 3. Execution Context
        on_chunk_cb = self.config.get("_on_chunk")
        node_id = self.config.get("_node_id", "unknown")
        
        # 4. Global Stats Tracking
        total_rows_processed = 0
        total_rows_failed = 0
        schema_verified = False
        
        for df in data:
            if df.empty:
                yield df
                continue
            
            # Ensure unique index
            df = df.reset_index(drop=True)
            total_rows_processed += len(df)
            
            # --- PHASE 1: Schema Drift Detection ---
            if not schema_verified:
                expected_cols = {rule.get("column") for rule in rules if rule.get("column")}
                actual_cols = set(df.columns)
                
                missing_cols = expected_cols - actual_cols
                extra_cols = actual_cols - expected_cols
                
                if missing_cols:
                    msg = f"SCHEMA DRIFT: Missing columns: {list(missing_cols)}"
                    logger.error(msg)
                    if strict:
                        raise PipelineExecutionError(msg)
                
                if extra_cols and not allow_drift:
                    msg = f"SCHEMA DRIFT: Unexpected columns: {list(extra_cols)}"
                    logger.error(msg)
                    if strict:
                        raise PipelineExecutionError(msg)
                
                schema_verified = True

            # --- PHASE 2: Row-Level Validation ---
            error_reasons = pd.Series("", index=df.index)
            
            for rule in rules:
                col = rule.get("column")
                check = rule.get("check")
                
                if not col or not check or col not in df.columns:
                    continue
                
                rule_invalid_mask = pd.Series(False, index=df.index)
                
                if check == "not_null":
                    rule_invalid_mask = df[col].isna()
                elif check == "unique":
                    rule_invalid_mask = df.duplicated(subset=[col], keep='first')
                elif check == "min_value":
                    val = rule.get("value")
                    if val is not None:
                        rule_invalid_mask = pd.to_numeric(df[col], errors='coerce') < val
                elif check == "max_value":
                    val = rule.get("value")
                    if val is not None:
                        rule_invalid_mask = pd.to_numeric(df[col], errors='coerce') > val
                elif check == "regex":
                    pattern = rule.get("pattern")
                    if pattern:
                        rule_invalid_mask = ~df[col].astype(str).str.match(pattern, na=False)
                elif check == "in_list":
                    allowed = rule.get("values")
                    if isinstance(allowed, list):
                        rule_invalid_mask = ~df[col].isin(allowed)
                elif check == "data_type":
                    expected = rule.get("type")
                    if expected == "int":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, (int, complex, np.integer)) or (isinstance(x, (float, np.floating)) and x.is_integer()))
                    elif expected == "float":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, (int, float, complex, np.number)))
                    elif expected == "string":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, str))
                    elif expected == "bool":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, (bool, np.bool_)) if x is not None and not pd.isna(x) else False)
                    elif expected == "date" or expected == "datetime":
                        rule_invalid_mask = pd.to_datetime(df[col], errors='coerce').isna() & df[col].notna()

                failure_msg = f"{col}:{check}"
                error_reasons.loc[rule_invalid_mask] += (error_reasons.loc[rule_invalid_mask].apply(lambda x: "; " if x else "") + failure_msg)

            # --- PHASE 3: Splitting and Quarantine ---
            failed_mask = error_reasons != ""
            failed_count = failed_mask.sum()
            total_rows_failed += failed_count
            
            if failed_count > 0:
                quarantine_df = df.loc[failed_mask].copy()
                quarantine_df["__synqx_quarantine_reason__"] = error_reasons.loc[failed_mask]
                quarantine_df["__synqx_quarantine_at__"] = pd.Timestamp.now()
                
                if on_chunk_cb:
                    on_chunk_cb(quarantine_df, direction="quarantine", error_count=failed_count)
                
                logger.warning(f"Remote Node {node_id}: Quarantined {failed_count} rows.")

            # --- PHASE 4: Threshold Checks ---
            if total_rows_processed > 0:
                failure_pct = (total_rows_failed / total_rows_processed) * 100
                if failure_pct > error_threshold_pct:
                    msg = f"DQ FAILURE: Failure rate ({failure_pct:.2f}%) exceeds threshold ({error_threshold_pct}%)."
                    raise PipelineExecutionError(msg)
                
                if error_threshold_rows > 0 and total_rows_failed > error_threshold_rows:
                    msg = f"DQ FAILURE: Failed row count ({total_rows_failed}) exceeds threshold ({error_threshold_rows} rows)."
                    raise PipelineExecutionError(msg)

            valid_df = df.loc[~failed_mask]
            if not valid_df.empty:
                yield valid_df
