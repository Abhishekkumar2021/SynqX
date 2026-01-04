from typing import List, Optional
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.models.enums import AlertLevel
from app.services.alert_service import AlertService
from app.services.audit_service import AuditService
from pydantic import BaseModel

router = APIRouter()

class WorkspaceRead(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    default_agent_group: Optional[str]
    role: str

    class Config:
        from_attributes = True

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_agent_group: Optional[str] = None

class WorkspaceMemberRead(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str]
    role: str
    joined_at: datetime

class MemberInviteRequest(BaseModel):
    email: str
    role: WorkspaceRole

class MemberUpdateRequest(BaseModel):
    role: WorkspaceRole

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_agent_group: Optional[str] = None
    clear_all_pipelines: Optional[bool] = False

@router.get("", response_model=List[WorkspaceRead])
def list_my_workspaces(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List all workspaces the current user belongs to (or all if superuser)."""
    if current_user.is_superuser:
        all_workspaces = db.query(Workspace).all()
        # For superusers, we find their actual membership for the role, 
        # or default to ADMIN if they aren't explicit members.
        results = []
        for ws in all_workspaces:
            membership = db.query(WorkspaceMember).filter(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == current_user.id
            ).first()
            
            results.append({
                "id": ws.id,
                "name": ws.name,
                "slug": ws.slug,
                "description": ws.description,
                "default_agent_group": ws.default_agent_group,
                "role": membership.role.value if membership else WorkspaceRole.ADMIN.value
            })
        return results

    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    
    results = []
    for m in memberships:
        ws = m.workspace
        results.append({
            "id": ws.id,
            "name": ws.name,
            "slug": ws.slug,
            "description": ws.description,
            "default_agent_group": ws.default_agent_group,
            "role": m.role.value
        })
    return results

@router.patch("/{workspace_id}", response_model=WorkspaceRead)
def update_workspace(
    workspace_id: int,
    request: WorkspaceUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_admin),
):
    """Update workspace details (name, description, runner group)."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if request.name is not None:
        ws.name = request.name
    if request.description is not None:
        ws.description = request.description
    if request.default_agent_group is not None:
        ws.default_agent_group = request.default_agent_group
    
    # If explicitly asked to clear all, OR if switching the workspace to internal mode
    if request.clear_all_pipelines or request.default_agent_group == "internal":
        from app.models.pipelines import Pipeline
        db.query(Pipeline).filter(Pipeline.workspace_id == workspace_id).update(
            {Pipeline.agent_group: "internal"},
            synchronize_session=False
        )
        
    db.add(ws)
    db.commit()
    db.refresh(ws)

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=workspace_id,
        event_type="workspace.update",
        target_id=ws.id,
        details={"name": ws.name, "description": ws.description, "default_agent_group": ws.default_agent_group}
    )
    
    # Get user's role for the response
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    
    return {
        "id": ws.id,
        "name": ws.name,
        "slug": ws.slug,
        "description": ws.description,
        "default_agent_group": ws.default_agent_group,
        "role": membership.role.value if membership else WorkspaceRole.ADMIN.value
    }

@router.post("", response_model=WorkspaceRead)
def create_workspace(
    request: WorkspaceCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Create a new workspace and add the creator as ADMIN."""
    slug = f"{request.name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:8]}"
    
    ws = Workspace(
        name=request.name,
        slug=slug,
        description=request.description,
        default_agent_group=request.default_agent_group
    )
    db.add(ws)
    db.flush()
    
    # Add creator as ADMIN
    member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=current_user.id,
        role=WorkspaceRole.ADMIN
    )
    db.add(member)
    
    # Automatically switch to new workspace
    current_user.active_workspace_id = ws.id
    db.add(current_user)
    
    db.commit()
    db.refresh(ws)

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=ws.id,
        event_type="workspace.create",
        target_id=ws.id,
        details={"name": ws.name}
    )
    
    return {
        "id": ws.id,
        "name": ws.name,
        "slug": ws.slug,
        "description": ws.description,
        "default_agent_group": ws.default_agent_group,
        "role": WorkspaceRole.ADMIN.value
    }

@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberRead])
def list_workspace_members(
    workspace_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_viewer),
):
    """List all members of a workspace."""
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    
    results = []
    for m in members:
        results.append({
            "user_id": m.user.id,
            "email": m.user.email,
            "full_name": m.user.full_name,
            "role": m.role.value,
            "joined_at": m.created_at
        })
    return results

@router.post("/{workspace_id}/members", response_model=WorkspaceMemberRead)
def invite_member(
    workspace_id: int,
    request: MemberInviteRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_admin),
):
    """Add a member to the workspace by email."""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")
        
    # Check if already a member
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")
        
    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=request.role
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    # Create a system alert for the invitation
    AlertService.create_system_alert(
        db,
        workspace_id=workspace_id,
        message=f"User {user.email} was invited to the workspace by {current_user.email}.",
        level=AlertLevel.INFO,
    )
    
    return {
        "user_id": member.user.id,
        "email": member.user.email,
        "full_name": member.user.full_name,
        "role": member.role.value,
        "joined_at": member.created_at
    }

@router.patch("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberRead)
def update_workspace_member(
    workspace_id: int,
    user_id: int,
    request: MemberUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_admin),
):
    """Update a member's role."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role. Ask another admin to do this.")

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    member.role = request.role
    db.add(member)
    db.commit()
    db.refresh(member)
    
    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=workspace_id,
        event_type="workspace.member.update_role",
        target_id=user_id,
        details={"role": request.role.value, "target_user_email": member.user.email}
    )

    return {
        "user_id": member.user.id,
        "email": member.user.email,
        "full_name": member.user.full_name,
        "role": member.role.value,
        "joined_at": member.created_at
    }

@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member(
    workspace_id: int,
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_admin),
):
    """Remove a member from the workspace."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself from the workspace. Delete the workspace or have another admin remove you.")

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    member_email = member.user.email
    db.delete(member)
    db.commit()

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=workspace_id,
        event_type="workspace.member.remove",
        target_id=user_id,
        details={"removed_user_email": member_email}
    )

    return None

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_admin),
):
    """Permanently delete a workspace and all its associated data."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Check if there's an active switch needed after deletion
    if current_user.active_workspace_id == workspace_id:
        current_user.active_workspace_id = None
        db.add(current_user)

    workspace_name = ws.name
    db.delete(ws)
    db.commit()

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=workspace_id, # The ID still exists before the function returns
        event_type="workspace.delete",
        target_id=workspace_id,
        details={"name": workspace_name}
    )
    return None

@router.post("/{workspace_id}/switch")
def switch_active_workspace(
    workspace_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Switch the current user's active workspace."""
    # Verify the workspace exists
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Verify membership (superusers bypass this)
    if not current_user.is_superuser:
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        ).first()
        
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    current_user.active_workspace_id = workspace_id
    db.add(current_user)
    db.commit()

    AuditService.log_event(
        db,
        user_id=current_user.id,
        workspace_id=workspace_id,
        event_type="workspace.switch_active",
        target_id=workspace_id
    )
    
    return {"status": "success", "workspace_id": workspace_id}

@router.get("/{workspace_id}/export")
def export_workspace_context(
    workspace_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: WorkspaceMember = Depends(deps.require_viewer),
):
    """Export complete workspace context as JSON."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    
    from fastapi.responses import JSONResponse
    
    export_data = {
        "workspace": {
            "id": ws.id,
            "name": ws.name,
            "slug": ws.slug,
            "description": ws.description,
            "created_at": ws.created_at.isoformat() if ws.created_at else None
        },
        "members": [
            {
                "user_id": m.user.id,
                "email": m.user.email,
                "full_name": m.user.full_name,
                "role": m.role.value,
                "joined_at": m.created_at.isoformat() if m.created_at else None
            } for m in members
        ],
        "exported_at": datetime.now().isoformat(),
        "exported_by": current_user.email
    }
    
    filename = f"synqx_workspace_{ws.slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
