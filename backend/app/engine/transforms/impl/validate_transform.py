from typing import Iterator, Optional
import pandas as pd
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError, PipelineExecutionError
from app.core.logging import get_logger
from app.engine.runner_core.forensics import ForensicSniffer
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
        quarantine = self.config.get("quarantine", False)
        
        run_id = self.config.get("_run_id")
        node_id = self.config.get("_node_id")
        pipeline_id = self.config.get("_pipeline_id")
        
        sniffer: Optional[ForensicSniffer] = None
        if quarantine and run_id:
            sniffer = ForensicSniffer(run_id)

        for df in data:
            if df.empty:
                yield df
                continue
                
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
                invalid_mask = pd.Series(False, index=df.index)
                
                if check == "not_null":
                    invalid_mask = df[col].isna()
                
                elif check == "unique":
                    invalid_mask = df.duplicated(subset=[col], keep='first')
                
                elif check == "min_value":
                    min_val = rule.get("value")
                    if min_val is not None:
                        invalid_mask = df[col] < min_val

                elif check == "max_value":
                    max_val = rule.get("value")
                    if max_val is not None:
                        invalid_mask = df[col] > max_val
                
                elif check == "regex":
                    pattern = rule.get("pattern")
                    if pattern:
                        invalid_mask = ~df[col].astype(str).str.match(pattern, na=False)

                # Collect failed indices for this rule
                rule_failed_indices = df.index[invalid_mask]
                if not rule_failed_indices.empty:
                    failed_indices = failed_indices.union(rule_failed_indices)
                    msg = f"Rule '{check}' failed for {len(rule_failed_indices)} rows in column '{col}'"
                    chunk_errors.append(msg)
                    logger.warning(f"Validation failed: {msg}")

            # Trigger Alerts if there are failures
            if not failed_indices.empty and pipeline_id:
                try:
                    alert_msg = f"Data Quality validation failed in node {node_id or 'unknown'}: {len(failed_indices)} rows violated rules."
                    with session_scope() as session:
                        AlertService.trigger_alerts(
                            session,
                            alert_type=AlertType.DATA_QUALITY_FAILURE,
                            pipeline_id=pipeline_id,
                            job_id=run_id, # run_id matches job_id in SynqX
                            message=alert_msg,
                            level=AlertLevel.WARNING
                        )
                except Exception as alert_err:
                    logger.error(f"Failed to trigger DQ alert: {alert_err}")

            # Handle Quarantine
            if quarantine and sniffer and not failed_indices.empty and node_id:
                quarantine_df = df.loc[failed_indices]
                sniffer.capture_chunk(node_id, quarantine_df, direction="quarantine")
            
            # Handle Strict Mode
            if strict and not failed_indices.empty:
                error_summary = "; ".join(chunk_errors[:3])
                if len(chunk_errors) > 3:
                    error_summary += f" (+{len(chunk_errors)-3} more)"
                raise PipelineExecutionError(f"Strict validation failed: {error_summary}")

            # Return valid rows
            yield df
