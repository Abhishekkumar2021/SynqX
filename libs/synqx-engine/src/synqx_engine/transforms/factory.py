from typing import Any, Literal

from synqx_core.errors import ConfigurationError

from synqx_engine.transforms.base import BaseTransform
from synqx_engine.transforms.polars_base import PolarsTransform


class TransformFactory:
    """
    Factory for creating transform instances (Pandas or Polars).
    """

    _registry: dict[str, type[BaseTransform | PolarsTransform]] = {}  # noqa: RUF012

    @classmethod
    def register_transform(
        cls,
        transform_type: str,
        transform_class: type[BaseTransform | PolarsTransform],
    ) -> None:
        if not issubclass(transform_class, (BaseTransform, PolarsTransform)):
            raise TypeError(
                "Transform class must inherit from BaseTransform or PolarsTransform."
            )
        cls._registry[transform_type.lower()] = transform_class

    @classmethod
    def get_transform(
        cls, transform_type: str, config: dict[str, Any]
    ) -> BaseTransform | PolarsTransform:
        # Auto-discover if registry is empty (resiliency for worker processes)
        if not cls._registry:
            try:
                import synqx_engine.transforms.impl  # noqa: F401, PLC0415
            except ImportError:
                pass

        transform_class = cls._registry.get(transform_type.lower())
        if not transform_class:
            raise ConfigurationError(
                f"Transform type '{transform_type}' not registered. Available: {list(cls._registry.keys())}"  # noqa: E501
            )

        try:
            return transform_class(config)
        except Exception as e:
            raise ConfigurationError(
                f"Error instantiating transform type '{transform_type}': {e}"
            ) from e

    @staticmethod
    def get_engine(
        transform: BaseTransform | PolarsTransform,
    ) -> Literal["pandas", "polars"]:
        if isinstance(transform, PolarsTransform):
            return "polars"
        return "pandas"
