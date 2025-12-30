import json
from typing import Optional, Any, Callable, TypeVar
from functools import wraps
import redis
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")

class CacheService:
    _instance = None

    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.default_ttl = 300  # 5 minutes default

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get(self, key: str) -> Optional[Any]:
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        try:
            serialized = json.dumps(value, default=str) # handle dates/etc
            return self.redis.set(key, serialized, ex=ttl or self.default_ttl)
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
            return False
            
    def delete_pattern(self, pattern: str) -> int:
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern error {pattern}: {e}")
            return 0

cache = CacheService.get_instance()

def cached(key_prefix: str, ttl: int = 300):
    """
    Decorator to cache function results.
    Key is generated as: {key_prefix}:{arg1}:{arg2}...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Simple key generation strategy: skip 'self' (first arg) if it's a method
            # This is a naive implementation, might need adjustment for complex args
            cache_args = args[1:] if args and hasattr(args[0], '__dict__') else args 
            
            key_parts = [str(arg) for arg in cache_args]
            key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
            key = f"{key_prefix}:{':'.join(key_parts)}"
            
            cached_value = cache.get(key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {key}")
                return cached_value
            
            result = func(*args, **kwargs)
            
            # Only cache if result is JSON serializable (pydantic models usually need .model_dump())
            # We assume the service returns Pydantic models or dicts
            to_cache = result
            if hasattr(result, "model_dump"):
                to_cache = result.model_dump(mode='json')
            elif isinstance(result, list) and result and hasattr(result[0], "model_dump"):
                 to_cache = [item.model_dump(mode='json') for item in result]
                 
            cache.set(key, to_cache, ttl=ttl)
            return result
        return wrapper
    return decorator
