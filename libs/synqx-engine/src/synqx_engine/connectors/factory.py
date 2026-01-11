from typing import Dict, Any, Type
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError

class ConnectorFactory:
    """
    A factory class for creating connector instances dynamically.
    Connectors must inherit from BaseConnector.
    """
    _registry: Dict[str, Type[BaseConnector]] = {}

    @classmethod
    def register_connector(cls, connector_type: str, connector_class: Type[BaseConnector]) -> None:
        """
        Registers a new connector class with the factory.

        Args:
            connector_type: A unique string identifier for the connector (e.g., "postgres", "s3").
            connector_class: The class of the connector to register. Must inherit from BaseConnector.
        """
        if not issubclass(connector_class, BaseConnector):
            raise TypeError("Connector class must inherit from BaseConnector.")
        cls._registry[connector_type.lower()] = connector_class

    @classmethod
    def get_connector(cls, connector_type: str, config: Dict[str, Any]) -> BaseConnector:
        # Auto-discover if registry is empty
        if not cls._registry:
            try:
                import synqx_engine.connectors.impl # noqa: F401
            except ImportError:
                pass

        connector_class = cls._registry.get(connector_type.lower())
        if not connector_class:
            raise ConfigurationError(f"Connector type '{connector_type}' not registered. Available: {list(cls._registry.keys())}")
        
        try:
            return connector_class(config)
        except ConfigurationError as e:
            raise ConfigurationError(
                f"Invalid configuration for connector type '{connector_type}': {e}"
            ) from e
        except Exception as e:
            # Catch other potential errors during instantiation
            raise ConfigurationError(
                f"Error instantiating connector type '{connector_type}': {e}"
            ) from e
