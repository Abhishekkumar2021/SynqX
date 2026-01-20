from collections.abc import Generator
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session
from synqx_core.models.api_keys import ApiKey
from synqx_core.models.user import User
from synqx_core.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from synqx_core.schemas.auth import TokenPayload

from app.core import security
from app.core.cache import cache
from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import SessionLocal

logger = get_logger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_db() -> Generator[Session]:
    """
    Dependency that provides a database session.
    Automatically commits on success and rolls back on error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_active_workspace(db: Session, user: User) -> User:
    """Helper to ensure a user has an active workspace, creating one if needed."""
    if user.active_workspace_id:
        return user

    # Check if they have any memberships
    first_membership = (
        db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
    )

    if first_membership:
        user.active_workspace_id = first_membership.workspace_id
        db.add(user)
        db.flush()  # Use flush instead of commit to avoid premature transaction end
        return user

    # Create a personal workspace for the user
    personal_ws = Workspace(
        name=f"{user.full_name or user.email.split('@')[0]}'s Workspace",
        slug=f"personal-{user.id}-{str(datetime.now().timestamp())[:5]}",
        description="Auto-generated personal workspace",
    )
    db.add(personal_ws)
    db.flush()

    # Add user as ADMIN
    member = WorkspaceMember(
        workspace_id=personal_ws.id, user_id=user.id, role=WorkspaceRole.ADMIN
    )
    db.add(member)

    user.active_workspace_id = personal_ws.id
    db.add(user)
    db.flush()
    return user


def get_current_user(
    db: Session = Depends(get_db),  # noqa: B008
    token: str | None = Depends(reusable_oauth2),
    api_key: str | None = Security(api_key_header),
) -> User:
    # 1. Try API Key first
    if api_key:
        hashed_key = security.get_api_key_hash(api_key)

        # Try to get API key info from cache
        cache_key = f"auth:apikey:{hashed_key}"
        cached_data = cache.get(cache_key)

        if cached_data:
            user_id = cached_data.get("user_id")
            workspace_id = cached_data.get("workspace_id")
            # We still fetch the user from DB to get a fresh SQLAlchemy object
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.is_active:
                if workspace_id:
                    user.active_workspace_id = workspace_id
                return ensure_active_workspace(db, user)

        # Cache miss or invalid user in cache, check DB
        stored_key = db.query(ApiKey).filter(ApiKey.hashed_key == hashed_key).first()

        if stored_key:
            if not stored_key.is_active:
                raise HTTPException(status_code=403, detail="API key is inactive")

            if stored_key.expires_at and stored_key.expires_at < datetime.now(UTC):
                raise HTTPException(status_code=403, detail="API key has expired")

            # Update last used (async or background would be better, but flush for now)
            stored_key.last_used_at = datetime.now(UTC)
            db.add(stored_key)
            db.flush()

            # Get associated user
            user = db.query(User).filter(User.id == stored_key.user_id).first()
            if not user:
                raise HTTPException(
                    status_code=404, detail="User associated with API key not found"
                )
            if not user.is_active:
                raise HTTPException(status_code=400, detail="Inactive user")

            # Cache the result for 5 minutes
            cache.set(
                cache_key,
                {"user_id": user.id, "workspace_id": stored_key.workspace_id},
                ttl=300,
            )

            # If API key is tied to a specific workspace, use it for this request
            if stored_key.workspace_id:
                user.active_workspace_id = stored_key.workspace_id

            return ensure_active_workspace(db, user)
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
        user_id = int(token_data.sub)
    except (JWTError, ValidationError, ValueError):
        raise HTTPException(  # noqa: B904
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    # Cache user lookup
    user_cache_key = f"auth:user:{user_id}"
    cached_user_active = cache.get(user_cache_key)

    if cached_user_active is False:
        raise HTTPException(status_code=400, detail="Inactive user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        cache.set(user_cache_key, False, ttl=300)
        raise HTTPException(status_code=400, detail="Inactive user")

    # Cache that user is active
    cache.set(user_cache_key, True, ttl=300)

    return ensure_active_workspace(db, user)


def get_current_active_membership(
    db: Session = Depends(get_db),  # noqa: B008
    current_user: User = Depends(get_current_user),  # noqa: B008
) -> WorkspaceMember:
    """Returns the membership of the current user in their active workspace."""
    if not current_user.active_workspace_id:
        raise HTTPException(status_code=400, detail="User has no active workspace")

    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == current_user.active_workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )

    if not membership:
        # Superusers can access any workspace as an ADMIN even if not an explicit member
        if current_user.is_superuser:
            return WorkspaceMember(
                workspace_id=current_user.active_workspace_id,
                user_id=current_user.id,
                role=WorkspaceRole.ADMIN,
            )
        raise HTTPException(
            status_code=403, detail="User is not a member of the active workspace"
        )

    return membership


class RoleChecker:
    def __init__(self, allowed_roles: list[WorkspaceRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        current_user: User = Depends(get_current_user),  # noqa: B008
        membership: WorkspaceMember = Depends(get_current_active_membership),  # noqa: B008
    ) -> WorkspaceMember:
        # Superusers bypass all workspace role checks
        if current_user.is_superuser:
            return membership

        if membership.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of these roles: {[r.value for r in self.allowed_roles]}",  # noqa: E501
            )
        return membership


# Pre-defined role checkers
require_admin = RoleChecker([WorkspaceRole.ADMIN])
require_editor = RoleChecker([WorkspaceRole.ADMIN, WorkspaceRole.EDITOR])
require_viewer = RoleChecker(
    [WorkspaceRole.ADMIN, WorkspaceRole.EDITOR, WorkspaceRole.VIEWER]
)


class PaginationParams:
    """
    Reusable pagination parameters.
    """

    def __init__(self, limit: int = 100, offset: int = 0):
        if limit < 1 or limit > 1000:  # noqa: PLR2004
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Invalid pagination",
                    "message": "Limit must be between 1 and 1000",
                },
            )

        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Invalid pagination",
                    "message": "Offset must be non-negative",
                },
            )

        self.limit = limit
        self.offset = offset


def get_pagination_params(limit: int = 100, offset: int = 0) -> PaginationParams:
    """
    Dependency for pagination parameters with validation.
    """
    return PaginationParams(limit=limit, offset=offset)
