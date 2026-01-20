import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from synqx_core.schemas import api_key as api_key_schema

from app import models
from app.api import deps
from app.core import security
from app.services.audit_service import AuditService

router = APIRouter()


@router.post("/", response_model=api_key_schema.ApiKeyCreated)
def create_api_key(
    *,
    db: Session = Depends(deps.get_db),  # noqa: B008
    api_key_in: api_key_schema.ApiKeyCreate,
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_admin),  # noqa: B008
) -> Any:
    """
    Create a new API key for the workspace.
    """
    # Generate key with "sk_" prefix for easy identification
    raw_key = f"sk_{secrets.token_urlsafe(32)}"
    hashed_key = security.get_api_key_hash(raw_key)
    # Store first 8 chars (including sk_) for identification
    prefix = raw_key[:8]

    expires_at = None
    if api_key_in.expires_in_days:
        expires_at = datetime.now(UTC) + timedelta(days=api_key_in.expires_in_days)

    db_obj = models.ApiKey(
        name=api_key_in.name,
        prefix=prefix,
        hashed_key=hashed_key,
        scopes=api_key_in.scopes,
        expires_at=expires_at,
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
        created_by=str(current_user.id),  # AuditMixin
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # Return with raw key (temporary attribute, not in DB)
    db_obj.key = raw_key

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
        event_type="api_key.create",
        target_type="ApiKey",
        target_id=db_obj.id,
        details={"name": db_obj.name},
    )

    return db_obj


@router.get("/", response_model=list[api_key_schema.ApiKeyResponse])
def list_api_keys(
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_admin),  # noqa: B008
    pagination: deps.PaginationParams = Depends(deps.get_pagination_params),  # noqa: B008
) -> Any:
    """
    List API keys for the active workspace.
    """
    keys = (
        db.query(models.ApiKey)
        .filter(models.ApiKey.workspace_id == current_user.active_workspace_id)
        .offset(pagination.offset)
        .limit(pagination.limit)
        .all()
    )
    return keys


@router.delete("/{key_id}", response_model=api_key_schema.ApiKeyResponse)
def revoke_api_key(
    *,
    db: Session = Depends(deps.get_db),  # noqa: B008
    key_id: int,
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_admin),  # noqa: B008
) -> Any:
    """
    Revoke (delete) an API key from the active workspace.
    """
    key = (
        db.query(models.ApiKey)
        .filter(
            models.ApiKey.id == key_id,
            models.ApiKey.workspace_id == current_user.active_workspace_id,
        )
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key_name = key.name
    db.delete(key)
    db.commit()

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
        event_type="api_key.revoke",
        target_type="ApiKey",
        target_id=key_id,
        details={"name": key_name},
    )

    return key
