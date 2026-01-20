import hashlib
import json
import logging
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

logger = logging.getLogger("SynqX-Agent-Executor")


class EngineManager:
    """
    Singleton manager for persistent SQLAlchemy Engines on the Remote Agent.
    """

    _engines: dict[str, Engine] = {}  # noqa: RUF012

    @classmethod
    def _get_config_hash(cls, connector_type: str, config: dict[str, Any], options: dict[str, Any]) -> str:
        clean_config = {
            k: v
            for k, v in config.items()
            if k not in ["execution_context", "ui", "connection_id"]
        }
        # Include options in hash to detect changes in connection parameters
        combined = {
            "connector_type": connector_type,
            "config": clean_config,
            "options": options
        }
        config_str = json.dumps(combined, sort_keys=True, default=str)
        return hashlib.sha256(config_str.encode()).hexdigest()

    @classmethod
    def get_engine(
        cls,
        connector_type: str,
        url: str,
        options: dict[str, Any],
        config: dict[str, Any],
    ) -> Engine:
        config_hash = cls._get_config_hash(connector_type, config, options)
        if config_hash not in cls._engines:
            logger.info(
                f"Establishing new persistent connection pool for {connector_type}"
            )
            cls._engines[config_hash] = create_engine(url, **options)
        return cls._engines[config_hash]

    @classmethod
    def dispose_all(cls):
        for engine in cls._engines.values():
            engine.dispose()
        cls._engines.clear()
