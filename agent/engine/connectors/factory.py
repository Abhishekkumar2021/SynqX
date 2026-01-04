from typing import Dict, Any, Type
from engine.connectors.base import BaseConnector
from engine.core.errors import ConfigurationError

class ConnectorFactory:
    _registry: Dict[str, Type[BaseConnector]] = {}

    @classmethod
    def register_connector(cls, connector_type: str, connector_class: Type[BaseConnector]) -> None:
        if not issubclass(connector_class, BaseConnector):
            raise TypeError("Connector class must inherit from BaseConnector.")
        cls._registry[connector_type.lower()] = connector_class

    @classmethod
    def get_connector(cls, connector_type: str, config: Dict[str, Any]) -> BaseConnector:
        if not cls._registry:
            try:
                import engine.connectors.impl # noqa: F401
            except ImportError as e:
                import logging
                logger = logging.getLogger("SynqX-Agent")
                logger.warning(f"Failed to auto-discover connectors: {e}")

        connector_class = cls._registry.get(connector_type.lower())
        if not connector_class:
            raise ConfigurationError(f"Connector type '{connector_type}' not registered. Available: {list(cls._registry.keys())}")
        
        try:
            return connector_class(config)
        except Exception as e:
            raise ConfigurationError(f"Error instantiating connector type '{connector_type}': {e}") from e
