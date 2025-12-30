from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import contextmanager

from app.core.config import settings

# Create the database engine with NullPool to disable pooling.
# This ensures that connections are closed immediately and not held 
# in a pool, preventing "too many clients" errors across many processes.
engine = create_engine(
    settings.DATABASE_URL, 
    poolclass=NullPool,
    echo=False
)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@contextmanager
def session_scope():
    """
    Context manager for database sessions, useful for Celery tasks
    and other background operations.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()