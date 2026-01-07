import hashlib
import json
from typing import Dict, Any
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from app.core.logging import get_logger

logger = get_logger(__name__)

class EngineManager:
    """
    Singleton manager for persistent SQLAlchemy Engines and Connection Pools.
    Prevents the overhead of recreating engines on every request.
    """
    _engines: Dict[str, Engine] = {}

    @classmethod
    def _get_config_hash(cls, connector_type: str, config: Dict[str, Any]) -> str:
        # Exclude volatile keys that don't affect the connection itself
        clean_config = {
            k: v for k, v in config.items() 
            if k not in ["execution_context", "ui", "connection_id"]
        }
        config_str = f"{connector_type}:{json.dumps(clean_config, sort_keys=True)}"
        return hashlib.sha256(config_str.encode()).hexdigest()

    @classmethod
    def get_engine(cls, connector_type: str, url: str, options: Dict[str, Any], config: Dict[str, Any]) -> Engine:
        config_hash = cls._get_config_hash(connector_type, config)
        
        if config_hash not in cls._engines:
            logger.info(f"Creating new persistent engine for {connector_type} (hash: {config_hash[:8]})")
            cls._engines[config_hash] = create_engine(url, **options)
        else:
            logger.debug(f"Reusing existing persistent engine for {connector_type}")
            
        return cls._engines[config_hash]

    @classmethod
    def dispose_all(cls):
        for engine in cls._engines.values():
            engine.dispose()
        cls._engines.clear()
        logger.info("All persistent engines disposed.")
