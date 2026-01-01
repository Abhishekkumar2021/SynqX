from typing import Iterator
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError, PipelineExecutionError
from app.core.logging import get_logger
from app.services.alert_service import AlertService
from app.models.enums import AlertType, AlertLevel
from app.db.session import session_scope

logger = get_logger(__name__)

class ValidateTransform(BaseTransform):
    """
    Data Quality & Validation Transform.
    Applies rules to ensure data integrity.
    
    Features:
    - Strict Mode: Fails the pipeline if any row fails validation.
    - Quarantine: Captures invalid rows for forensic analysis.
    - Alerting: Triggers Data Quality alerts on failure.
    - Extensive Checks: nulls, uniqueness, ranges, regex, types, etc.
    """

    def validate_config(self) -> None:
        if "schema" not in self.config:
            raise ConfigurationError("ValidateTransform requires a 'schema' configuration.")
        
        rules = self.config.get("schema")
        if not isinstance(rules, list):
            raise ConfigurationError("'schema' must be a list of validation rules.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        rules = self.config.get("schema", [])
        strict = self.config.get("strict", False)
        self.config.get("quarantine", False)
        
        self.config.get("_run_id")
        job_id = self.config.get("_job_id")
        node_id = self.config.get("_node_id")
        pipeline_id = self.config.get("_pipeline_id")
        
        on_chunk_cb = self.config.get("_on_chunk")
        
        for df in data:
            if df.empty:
                yield df
                continue
            
            # Ensure unique index to prevent accidental over-dropping
            df = df.reset_index(drop=True)
            
            # Track failed rows for this chunk
            failed_indices = pd.Index([])
            chunk_errors = []
            
            for rule in rules:
                col = rule.get("column")
                check = rule.get("check")
                
                if not col or not check:
                    continue
                    
                if col not in df.columns:
                    logger.warning(f"Validation column '{col}' not found in DataFrame.")
                    continue
                
                # Validation Logic - returns a boolean Series where True = Invalid
                rule_invalid_mask = pd.Series(False, index=df.index)
                
                if check == "not_null":
                    rule_invalid_mask = df[col].isna()
                
                elif check == "unique":
                    rule_invalid_mask = df.duplicated(subset=[col], keep='first')
                
                elif check == "min_value":
                    min_val = rule.get("value")
                    if min_val is not None:
                        rule_invalid_mask = pd.to_numeric(df[col], errors='coerce') < min_val

                elif check == "max_value":
                    max_val = rule.get("value")
                    if max_val is not None:
                        rule_invalid_mask = pd.to_numeric(df[col], errors='coerce') > max_val
                
                elif check == "regex":
                    pattern = rule.get("pattern")
                    if pattern:
                        rule_invalid_mask = ~df[col].astype(str).str.match(pattern, na=False)
                
                elif check == "in_list":
                    allowed = rule.get("values")
                    if isinstance(allowed, list):
                        rule_invalid_mask = ~df[col].isin(allowed)
                
                elif check == "data_type":
                    expected = rule.get("type") # int, float, string, date
                    if expected == "int":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, (int, complex)) or (isinstance(x, float) and x.is_integer()))
                    elif expected == "float":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, (int, float, complex)))
                    elif expected == "string":
                        rule_invalid_mask = ~df[col].apply(lambda x: isinstance(x, str))

                # Collect failed indices for this rule
                rule_failed_indices = df.index[rule_invalid_mask]
                if not rule_failed_indices.empty:
                    failed_indices = failed_indices.union(rule_failed_indices)
                    msg = f"Rule '{check}' failed for {len(rule_failed_indices)} rows in column '{col}'"
                    chunk_errors.append(msg)
                    logger.warning(f"Validation failed: {msg}")

            if not failed_indices.empty:
                logger.info(f"Node {node_id} found {len(failed_indices)} total invalid rows in chunk")

            # Trigger Alerts if there are failures
            if not failed_indices.empty and pipeline_id:
                try:
                    alert_msg = f"Data Quality validation failed in node {node_id or 'unknown'}: {len(failed_indices)} rows violated rules."
                    with session_scope() as session:
                        AlertService.trigger_alerts(
                            session,
                            alert_type=AlertType.DATA_QUALITY_FAILURE,
                            pipeline_id=pipeline_id,
                            job_id=job_id,
                            message=alert_msg,
                            level=AlertLevel.WARNING
                        )
                except Exception as alert_err:
                    logger.error(f"Failed to trigger DQ alert: {alert_err}")

            # Handle Quarantine
            if not failed_indices.empty:
                error_count = len(failed_indices)
                quarantine_df = df.loc[failed_indices]
                
                # Report metrics and sniff back to executor
                if on_chunk_cb:
                    on_chunk_cb(quarantine_df, direction="quarantine", error_count=error_count)
            
            # Handle Strict Mode
            if strict and not failed_indices.empty:
                error_summary = "; ".join(chunk_errors[:3])
                if len(chunk_errors) > 3:
                    error_summary += f" (+{len(chunk_errors)-3} more)"
                raise PipelineExecutionError(f"Strict validation failed: {error_summary}")

            # Return valid rows
            if not failed_indices.empty:
                yield df.drop(index=failed_indices)
            else:
                yield df
