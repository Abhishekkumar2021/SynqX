import json
from typing import Any

import polars as pl
from synqx_core.logging import get_logger

logger = get_logger(__name__)


class ContractValidator:
    """
    High-performance Data Contract Validator using Polars.
    Supports validating chunks against a predefined set of rules.
    Standardized on JSON for cross-platform compatibility.
    """

    def __init__(self, contract_config: dict[str, Any] | str):
        if isinstance(contract_config, str):
            try:
                # Standardize on JSON input
                self.config = (
                    json.loads(contract_config) if contract_config.strip() else {}
                )
            except Exception as e:
                logger.error(f"Failed to parse Data Contract JSON: {e}")
                self.config = {}
        else:
            self.config = contract_config or {}

        self.rules = self.config.get("columns", [])
        self.strict = self.config.get("strict", False)

    @classmethod
    def from_json(cls, json_str: str) -> "ContractValidator":
        """Factory to create validator from JSON string"""
        try:
            config = json.loads(json_str)
            return cls(config or {})
        except Exception as e:
            logger.error(f"Failed to parse Data Contract JSON: {e}")
            return cls({})

    def validate_chunk(self, df: pl.DataFrame) -> tuple[pl.DataFrame, pl.DataFrame]:  # noqa: PLR0912
        """
        Validates a Polars DataFrame against the contract.
        Returns: (valid_df, quarantined_df)
        """
        if df.is_empty() or not self.rules:
            return df, pl.DataFrame(schema=df.schema)

        invalid_masks = []

        # 1. Apply validation rules
        for rule in self.rules:
            col_name = rule.get("name") or rule.get("column")
            if not col_name:
                continue

            if col_name not in df.columns:
                if rule.get("required", False):
                    # Column missing entirely - mark all rows as failing this rule
                    rule_id = f"_fail_{col_name}_missing"
                    df = df.with_columns(pl.lit(True).alias(rule_id))
                    invalid_masks.append(rule_id)
                continue

            expr = None
            # Check for nulls
            if rule.get("required", False) or rule.get("not_null", False):
                expr = pl.col(col_name).is_null()

            # Type checks
            expected_type = rule.get("type")
            if expected_type:
                # Basic type validation logic (Simplified for prototype)
                if expected_type == "integer":
                    expr = (
                        pl.col(col_name).cast(pl.Int64, strict=False).is_null()
                        & pl.col(col_name).is_not_null()
                    )
                elif expected_type == "float":
                    expr = (
                        pl.col(col_name).cast(pl.Float64, strict=False).is_null()
                        & pl.col(col_name).is_not_null()
                    )
                elif expected_type == "boolean":
                    expr = (
                        pl.col(col_name).cast(pl.Boolean, strict=False).is_null()
                        & pl.col(col_name).is_not_null()
                    )

            # Range checks
            if rule.get("min") is not None:
                new_expr = pl.col(col_name) < rule.get("min")
                expr = new_expr if expr is None else expr | new_expr

            if rule.get("max") is not None:
                new_expr = pl.col(col_name) > rule.get("max")
                expr = new_expr if expr is None else expr | new_expr

            # Regex check
            if rule.get("pattern"):
                new_expr = pl.col(col_name).str.contains(rule.get("pattern")).not_()
                expr = new_expr if expr is None else expr | new_expr

            # List check
            if rule.get("values"):
                new_expr = pl.col(col_name).is_in(rule.get("values")).not_()
                expr = new_expr if expr is None else expr | new_expr

            if expr is not None:
                rule_id = f"_fail_{col_name}_rule"
                df = df.with_columns(expr.alias(rule_id))
                invalid_masks.append(rule_id)

        if not invalid_masks:
            return df, pl.DataFrame(schema=df.schema)

        # 2. Split valid and invalid data
        any_invalid_expr = pl.any_horizontal(pl.col(invalid_masks))
        valid_df = df.filter(any_invalid_expr.not_()).drop(invalid_masks)
        invalid_df = df.filter(any_invalid_expr)

        if not invalid_df.is_empty():
            reasons = []
            for mask in invalid_masks:
                # Extract clean rule name for the reason column
                clean_name = mask.replace("_fail_", "").replace("_rule", "")
                reasons.append(
                    pl.when(pl.col(mask))
                    .then(pl.lit(f"[{clean_name}]"))
                    .otherwise(pl.lit(""))
                )

            invalid_df = invalid_df.with_columns(
                pl.concat_str(reasons, separator=" ").alias(
                    "__synqx_quarantine_reason__"
                )
            ).drop(invalid_masks)

        return valid_df, invalid_df
