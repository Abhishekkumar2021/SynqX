import hashlib
import json
import io
import base64
from typing import Any, Dict, Optional, List
import polars as pl
from app.core.cache import cache
from app.core.logging import get_logger

logger = get_logger(__name__)

class ResultCacheManager:
    """
    Manages caching of query results in Redis using Arrow IPC for maximum efficiency.
    """

    @staticmethod
    def _get_cache_key(connection_id: int, query: str, limit: int, offset: int, params: Optional[Dict]) -> str:
        # Generate stable hash for query context
        payload = {
            "conn": connection_id,
            "q": query,
            "l": limit,
            "o": offset,
            "p": params or {}
        }
        query_hash = hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return f"query_result:{connection_id}:{query_hash}"

    @classmethod
    def get_cached_result(cls, connection_id: int, query: str, limit: int, offset: int, params: Optional[Dict]) -> Optional[Dict[str, Any]]:
        key = cls._get_cache_key(connection_id, query, limit, offset, params)
        cached_data = cache.get(key)
        
        if not cached_data:
            return None
            
        try:
            logger.info(f"Cache hit for query on connection {connection_id}")
            # cached_data is a dict containing 'metadata' and 'arrow_data' (base64)
            metadata = cached_data.get("metadata", {})
            arrow_b64 = cached_data.get("arrow_data")
            
            if not arrow_b64:
                return None
                
            raw_arrow = base64.b64decode(arrow_b64)
            df = pl.read_ipc(io.BytesIO(raw_arrow))
            
            return {
                "results": df.to_dicts(),
                "summary": metadata.get("summary"),
                "from_cache": True
            }
        except Exception as e:
            logger.warning(f"Failed to retrieve cached result: {e}")
            return None

    @classmethod
    def set_cached_result(cls, connection_id: int, query: str, limit: int, offset: int, params: Optional[Dict], results: List[Dict], summary: Dict, ttl: int = 300):
        if not results:
            return
            
        try:
            key = cls._get_cache_key(connection_id, query, limit, offset, params)
            
            # 1. Convert to Arrow for storage efficiency
            df = pl.from_dicts(results)
            buffer = io.BytesIO()
            df.write_ipc(buffer)
            arrow_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # 2. Store in Redis
            cache_payload = {
                "metadata": {"summary": summary},
                "arrow_data": arrow_b64
            }
            
            cache.set(key, cache_payload, ttl=ttl)
            logger.debug(f"Cached result for connection {connection_id} ({len(results)} rows)")
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")
