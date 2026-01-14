from typing import Iterator
import polars as pl
from synqx_engine.transforms.polars_base import PolarsTransform
from synqx_core.errors import ConfigurationError, TransformationError

class ValidateTransform(PolarsTransform):
    """
    High-performance Data Quality & Validation using Polars.
    """

    def validate_config(self) -> None:
        if "schema" not in self.config:
            raise ConfigurationError("ValidateTransform requires a 'schema' configuration.")
        
        rules = self.config.get("schema")
        if not isinstance(rules, list):
            raise ConfigurationError("'schema' must be a list of validation rules.")

    def transform(self, data: Iterator[pl.DataFrame]) -> Iterator[pl.DataFrame]:
        rules = self.config.get("schema", [])
        strict = self.config.get("strict", False)
        on_chunk_cb = self.on_chunk
        
        for df in data:
            if df.is_empty():
                yield df
                continue
            
            invalid_masks = []
            
            for rule in rules:
                col_name = rule.get("column")
                check = rule.get("check")
                
                if not col_name or not check or col_name not in df.columns:
                    continue
                
                expr = None
                if check == "not_null":
                    expr = pl.col(col_name).is_null()
                elif check == "min_value":
                    val = rule.get("value")
                    if val is not None:
                        expr = pl.col(col_name) < val
                elif check == "max_value":
                    val = rule.get("value")
                    if val is not None:
                        expr = pl.col(col_name) > val
                elif check == "regex":
                    pattern = rule.get("pattern")
                    if pattern:
                        expr = pl.col(col_name).str.contains(pattern).not_()
                elif check == "in_list":
                    allowed = rule.get("values")
                    if allowed:
                        expr = pl.col(col_name).is_in(allowed).not_()
                
                if expr is not None:
                    rule_id = f"_fail_{col_name}_{check}"
                    df = df.with_columns(expr.alias(rule_id))
                    invalid_masks.append(rule_id)

            if not invalid_masks:
                yield df
                continue

            any_invalid_expr = pl.any_horizontal(pl.col(invalid_masks))
            valid_df = df.filter(any_invalid_expr.not_()).drop(invalid_masks)
            invalid_df = df.filter(any_invalid_expr)

            if not invalid_df.is_empty():
                reasons = []
                for mask in invalid_masks:
                    reason_text = mask.replace("_fail_", "").replace("_", " ")
                    reasons.append(
                        pl.when(pl.col(mask)).then(pl.lit(f"[{reason_text}]")).otherwise(pl.lit(""))
                    )
                
                invalid_df = invalid_df.with_columns(
                    pl.concat_str(reasons, separator=" ").alias("error_reason")
                ).drop(invalid_masks)

                error_count = len(invalid_df)
                
                if strict:
                    first_error = invalid_df.get_column("error_reason")[0]
                    raise TransformationError(f"Strict validation failed. Example error: {first_error}")

                if on_chunk_cb:
                    on_chunk_cb(invalid_df.to_pandas(), direction="quarantine", error_count=error_count)

            yield valid_df