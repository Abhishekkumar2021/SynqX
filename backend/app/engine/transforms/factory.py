from typing import Dict, Any, Type
from app.engine.transforms.base import BaseTransform
from app.core.errors import ConfigurationError

class TransformFactory:
    """
    Factory for creating transform instances.
    """
    _registry: Dict[str, Type[BaseTransform]] = {}

    @classmethod
    def register_transform(cls, transform_type: str, transform_class: Type[BaseTransform]) -> None:
        if not issubclass(transform_class, BaseTransform):
            raise TypeError("Transform class must inherit from BaseTransform.")
        cls._registry[transform_type.lower()] = transform_class

    @classmethod
    def get_transform(cls, transform_type: str, config: Dict[str, Any]) -> BaseTransform:
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
