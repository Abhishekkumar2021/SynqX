from typing import Iterator
import pandas as pd
from engine.transforms.base import BaseTransform
from engine.core.errors import ConfigurationError

class RegexReplaceTransform(BaseTransform):
    """
    Replaces values using regex.
    Config:
    - column: str
    - pattern: str
    - replacement: str
    """

    def validate_config(self) -> None:
        if not all(k in self.config for k in ["column", "pattern", "replacement"]):
            raise ConfigurationError("RegexReplaceTransform requires 'column', 'pattern', and 'replacement'.")

    def transform(self, data: Iterator[pd.DataFrame]) -> Iterator[pd.DataFrame]:
        column = self.config["column"]
        pattern = self.config["pattern"]
        replacement = self.config["replacement"]
        
        for df in data:
            if column in df.columns:
                df[column] = df[column].astype(str).str.replace(pattern, replacement, regex=True)
            yield df
