from typing import Dict, Any, Type, Union, Literal
from app.engine.transforms.base import BaseTransform
from app.engine.transforms.polars_base import PolarsTransform
from app.core.errors import ConfigurationError

class TransformFactory:
    """
    Factory for creating transform instances (Pandas or Polars).
    """
    _registry: Dict[str, Type[Union[BaseTransform, PolarsTransform]]] = {}

    @classmethod
    def register_transform(cls, transform_type: str, transform_class: Type[Union[BaseTransform, PolarsTransform]]) -> None:
        if not issubclass(transform_class, (BaseTransform, PolarsTransform)):
            raise TypeError("Transform class must inherit from BaseTransform or PolarsTransform.")
        cls._registry[transform_type.lower()] = transform_class

    @classmethod
    def get_transform(cls, transform_type: str, config: Dict[str, Any]) -> Union[BaseTransform, PolarsTransform]:
        # Auto-discover if registry is empty (resiliency for worker processes)
        if not cls._registry:
            try:
                import app.engine.transforms.impl # noqa: F401
            except ImportError:
                pass

        transform_class = cls._registry.get(transform_type.lower())
        if not transform_class:
            raise ConfigurationError(f"Transform type '{transform_type}' not registered. Available: {list(cls._registry.keys())}")
        
        try:
            return transform_class(config)
        except Exception as e:
            raise ConfigurationError(
                f"Error instantiating transform type '{transform_type}': {e}"
            ) from e

    @staticmethod
    def get_engine(transform: Union[BaseTransform, PolarsTransform]) -> Literal["pandas", "polars"]:
        if isinstance(transform, PolarsTransform):
            return "polars"
        return "pandas"
