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
from synqx_core.models.user import User
from synqx_core.models.api_keys import ApiKey
from synqx_core.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from synqx_core.schemas.auth import TokenPayload

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

def _ensure_active_workspace(db: Session, user: User) -> User:
    """Helper to ensure a user has an active workspace, creating one if needed."""
    if user.active_workspace_id:
        return user
        
    # Check if they have any memberships
    first_membership = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
    
    if first_membership:
        user.active_workspace_id = first_membership.workspace_id
        db.add(user)
        db.commit()
        return user
        
    # Create a personal workspace for the user
    personal_ws = Workspace(
        name=f"{user.full_name or user.email.split('@')[0]}'s Workspace",
        slug=f"personal-{user.id}-{str(datetime.now().timestamp())[:5]}",
        description="Auto-generated personal workspace"
    )
    db.add(personal_ws)
    db.flush()
    
    # Add user as ADMIN
    member = WorkspaceMember(
        workspace_id=personal_ws.id,
        user_id=user.id,
        role=WorkspaceRole.ADMIN
    )
    db.add(member)
    
    user.active_workspace_id = personal_ws.id
    db.add(user)
    db.commit()
    return user

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
            
            # If API key is tied to a specific workspace, use it
            if stored_key.workspace_id:
                user.active_workspace_id = stored_key.workspace_id
                db.add(user)
                db.commit()

            return _ensure_active_workspace(db, user)
        else:
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
    
    return _ensure_active_workspace(db, user)

def get_current_active_membership(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkspaceMember:
    """Returns the membership of the current user in their active workspace."""
    if not current_user.active_workspace_id:
        raise HTTPException(status_code=400, detail="User has no active workspace")
        
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == current_user.active_workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    
    if not membership:
        # Superusers can access any workspace as an ADMIN even if not an explicit member
        if current_user.is_superuser:
            return WorkspaceMember(
                workspace_id=current_user.active_workspace_id,
                user_id=current_user.id,
                role=WorkspaceRole.ADMIN
            )
        raise HTTPException(status_code=403, detail="User is not a member of the active workspace")
        
    return membership

class RoleChecker:
    def __init__(self, allowed_roles: list[WorkspaceRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self, 
        current_user: User = Depends(get_current_user),
        membership: WorkspaceMember = Depends(get_current_active_membership)
    ) -> WorkspaceMember:
        # Superusers bypass all workspace role checks
        if current_user.is_superuser:
            return membership

        if membership.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of these roles: {[r.value for r in self.allowed_roles]}"
            )
        return membership

# Pre-defined role checkers
require_admin = RoleChecker([WorkspaceRole.ADMIN])
require_editor = RoleChecker([WorkspaceRole.ADMIN, WorkspaceRole.EDITOR])
require_viewer = RoleChecker([WorkspaceRole.ADMIN, WorkspaceRole.EDITOR, WorkspaceRole.VIEWER])


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
