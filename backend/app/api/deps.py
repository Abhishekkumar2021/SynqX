from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import ValidationError
from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.core.logging import get_logger
from app.core.config import settings
from app.core import security
from app.models.user import User
from app.models.api_keys import ApiKey
from app.schemas.auth import TokenPayload

logger = get_logger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False 
)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Automatically commits on success and rolls back on error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(reusable_oauth2),
    api_key: Optional[str] = Security(api_key_header)
) -> User:
    
    # 1. Try API Key first
    if api_key:
        hashed_key = security.get_api_key_hash(api_key)
        # Find key in DB (this could be optimized with caching)
        stored_key = db.query(ApiKey).filter(ApiKey.hashed_key == hashed_key).first()
        
        if stored_key:
            if not stored_key.is_active:
                 raise HTTPException(status_code=403, detail="API key is inactive")
            
            if stored_key.expires_at and stored_key.expires_at < datetime.now(timezone.utc):
                 raise HTTPException(status_code=403, detail="API key has expired")
            
            # Update last used
            stored_key.last_used_at = datetime.now(timezone.utc)
            db.commit()
            
            # Get associated user
            user = db.query(User).filter(User.id == stored_key.user_id).first()
            if not user:
                 raise HTTPException(status_code=404, detail="User associated with API key not found")
            if not user.is_active:
                 raise HTTPException(status_code=400, detail="Inactive user")
            return user
        else:
             # If API key is provided but invalid, we might want to fail fast or fall through.
             # Security-wise, if they tried an API key, reject if invalid.
             raise HTTPException(status_code=403, detail="Invalid API Key")

    # 2. Fallback to Bearer Token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


class PaginationParams:
    """
    Reusable pagination parameters.
    """
    def __init__(
        self,
        limit: int = 100,
        offset: int = 0
    ):
        if limit < 1 or limit > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Invalid pagination",
                    "message": "Limit must be between 1 and 1000"
                }
            )
        
        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Invalid pagination",
                    "message": "Offset must be non-negative"
                }
            )
        
        self.limit = limit
        self.offset = offset


def get_pagination_params(
    limit: int = 100,
    offset: int = 0
) -> PaginationParams:
    """
    Dependency for pagination parameters with validation.
    """
    return PaginationParams(limit=limit, offset=offset)
