import time
import functools
import random
from typing import Any, Callable, Tuple, Type, Union
from synqx_core.logging import get_logger

logger = get_logger(__name__)

def retry(
    exceptions: Union[Type[Exception], Tuple[Type[Exception], ...]] = Exception,
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    silent: bool = False
):
    """
    Exponential backoff retry decorator.
    
    Args:
        exceptions: Exception types to catch and retry.
        max_attempts: Maximum number of attempts.
        initial_delay: Initial delay between retries in seconds.
        backoff_factor: Multiplier for the delay after each attempt.
        jitter: Whether to add random jitter to the delay.
        silent: If True, only log warnings on final failure.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 1
            delay = initial_delay
            
            while attempt <= max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        if not silent:
                            logger.error(
                                f"Final attempt ({attempt}/{max_attempts}) for {func.__name__} failed: {e}"
                            )
                        raise
                    
                    if not silent:
                        logger.warning(
                            f"Attempt {attempt}/{max_attempts} for {func.__name__} failed: {e}. "
                            f"Retrying in {delay:.2f}s..."
                        )
                    
                    time.sleep(delay)
                    
                    attempt += 1
                    delay *= backoff_factor
                    if jitter:
                        delay *= (0.5 + random.random())
            
            return None # Should not reach here
        return wrapper
    return decorator
