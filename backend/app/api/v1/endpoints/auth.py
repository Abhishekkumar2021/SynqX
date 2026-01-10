from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserRead, UserUpdate
from app.services.audit_service import AuditService

from app.services.oidc_service import OIDCService

router = APIRouter()
logger = get_logger(__name__)

@router.get("/oidc/login_url")
async def get_oidc_login_url():
    """Returns the OIDC authorization URL to redirect the user."""
    if not settings.OIDC_ENABLED:
        raise HTTPException(status_code=400, detail="OIDC is disabled")
    
    config = await OIDCService.get_oidc_config()
    auth_endpoint = config.get("authorization_endpoint")
    
    params = {
        "client_id": settings.OIDC_CLIENT_ID,
        "response_type": "code",
        "scope": settings.OIDC_SCOPE,
        "redirect_uri": settings.OIDC_REDIRECT_URI,
        # In production, state should be a CSRF token
        "state": "random_string" 
    }
    
    query = "&".join([f"{k}={v}" for k, v in params.items()])
    return {"url": f"{auth_endpoint}?{query}"}

@router.post("/oidc/callback", response_model=Token)
async def oidc_callback(
    code: str,
    request: Request,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Handle OIDC callback after user authorization.
    Exchanges code for tokens, creates/updates user, and returns SynqX JWT.
    """
    if not settings.OIDC_ENABLED:
        raise HTTPException(status_code=400, detail="OIDC is disabled")

    try:
        # 1. Exchange code for tokens
        tokens = await OIDCService.get_token_from_code(code)
        access_token = tokens.get("access_token")
        
        # 2. Get User Info
        user_info = await OIDCService.get_user_info(access_token)
        email = user_info.get("email")
        oidc_id = str(user_info.get("sub"))
        full_name = user_info.get("name")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by OIDC provider")

        # 3. Find or Create User
        user = db.query(User).filter(User.oidc_id == oidc_id).first()
        if not user:
            # Fallback to email search (if user registered with password first)
            user = db.query(User).filter(User.email == email.lower()).first()
            if user:
                # Link existing user to OIDC
                user.oidc_id = oidc_id
                user.oidc_provider = "external" # Can be more specific if multiple providers supported
            else:
                # Create new user
                user = User(
                    email=email.lower(),
                    full_name=full_name,
                    oidc_id=oidc_id,
                    oidc_provider="external",
                    is_active=True,
                    hashed_password=None # OIDC users don't have a password
                )
                db.add(user)
            
            db.commit()
            db.refresh(user)

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Inactive user")

        # 4. Create SynqX Token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        synqx_token = security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
        
        AuditService.log_event(
            db,
            user_id=user.id,
            workspace_id=user.active_workspace_id,
            event_type="user.login.oidc",
            status="success",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        return {
            "access_token": synqx_token,
            "token_type": "bearer",
        }

    except AppError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OIDC Login failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during OIDC login")

@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Get an access token for future requests using email and password
    """
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(
            "login_failed", 
            email=form_data.username,
            reason="invalid_credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning("login_failed", email=user.email, reason="inactive_user")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    AuditService.log_event(
        db,
        user_id=user.id,
        workspace_id=user.active_workspace_id,
        event_type="user.login",
        status="success",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    *,
    request: Request,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    # Normalize email to lowercase
    email = user_in.email.lower()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        logger.warning("registration_failed", email=email, reason="email_exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists in the system",
        )
    
    try:
        # Create new user
        db_user = User(
            email=email,
            hashed_password=security.get_password_hash(user_in.password),
            full_name=user_in.full_name,
            is_superuser=user_in.is_superuser,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info("registration_success", user_id=db_user.id, email=db_user.email)
        
        AuditService.log_event(
            db,
            user_id=db_user.id,
            workspace_id=db_user.active_workspace_id, # This will be set by ensure_active_workspace
            event_type="user.create",
            status="success",
            target_id=db_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        return db_user
        
    except Exception as e:
        db.rollback()
        logger.error("registration_failed", email=email, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user. Please try again.",
        )

@router.get("/users/search", response_model=list[UserRead])
def search_users(
    q: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Search users by email for autocomplete.
    """
    if len(q) < 3:
        return []
    
    users = db.query(User).filter(
        User.email.ilike(f"%{q}%"),
        User.is_active
    ).limit(10).all()
    
    return users

@router.get("/me", response_model=UserRead)
def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.patch("/me", response_model=UserRead)
def update_users_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user.
    """
    if user_in.email and user_in.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists",
            )
        current_user.email = user_in.email
    
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
        
    if user_in.password:
        current_user.hashed_password = security.get_password_hash(user_in.password)
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
        event_type="user.update.profile",
        status="success",
        target_id=current_user.id,
        details={"updated_fields": user_in.model_dump(exclude_unset=True, exclude={'password'})}
    )

    return current_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_users_me(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """
    Delete current user.
    """
    db.delete(current_user)
    db.commit()

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
        event_type="user.delete",
        status="success",
        target_id=current_user.id
    )

    return None