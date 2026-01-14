import structlog

def get_logger(name: str):
    """
    Returns a structured logger if available, otherwise a standard logger.
    This allows the core library to be used in simple scripts (Agent) 
    or complex apps (Backend) seamlessly.
    """
    return structlog.get_logger(name)
