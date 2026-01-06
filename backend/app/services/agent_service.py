import secrets
import hashlib
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.agent import Agent
from app.models.enums import AgentStatus
from app.schemas.agent import AgentCreate, AgentHeartbeat, AgentToken
from app.core.errors import AppError, NotFoundError

class AgentService:
    @staticmethod
    def _hash_key(key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    @staticmethod
    def get_by_id(db: Session, agent_id: int, workspace_id: int) -> Agent:
        agent = db.query(Agent).filter(
            Agent.id == agent_id,
            Agent.workspace_id == workspace_id
        ).first()
        if not agent:
            raise NotFoundError("Agent not found")
        return agent

    @staticmethod
    def list_agents(db: Session, workspace_id: int) -> List[Agent]:
        return db.query(Agent).filter(Agent.workspace_id == workspace_id).all()

    @staticmethod
    def register_agent(db: Session, workspace_id: int, data: AgentCreate, user_id: int) -> AgentToken:
        # Check for existing agent name in the same workspace
        existing = db.query(Agent).filter(
            Agent.name == data.name,
            Agent.workspace_id == workspace_id,
            Agent.deleted_at.is_(None)
        ).first()
        
        if existing:
            raise AppError(f"A agent with the name '{data.name}' already exists in this workspace.")

        client_id = f"rng_{secrets.token_hex(8)}"
        api_key = f"sqx_rt_{secrets.token_urlsafe(32)}"
        
        try:
            agent = Agent(
                name=data.name,
                tags=data.tags,
                system_info=data.system_info,
                workspace_id=workspace_id,
                client_id=client_id,
                secret_key_hash=AgentService._hash_key(api_key),
                created_by=str(user_id),
                status=AgentStatus.OFFLINE
            )
            db.add(agent)
            db.commit()
            db.refresh(agent)
            
            return AgentToken(client_id=client_id, api_key=api_key)
        except IntegrityError:
            db.rollback()
            raise AppError(f"Failed to register agent: name '{data.name}' is already taken.")

    @staticmethod
    def authenticate_agent(db: Session, client_id: str, api_key: str) -> Optional[Agent]:
        agent = db.query(Agent).filter(Agent.client_id == client_id).first()
        if not agent:
            return None
        
        if agent.secret_key_hash == AgentService._hash_key(api_key):
            return agent
        return None

    @staticmethod
    def record_heartbeat(db: Session, agent: Agent, data: AgentHeartbeat) -> Agent:
        agent.status = data.status
        agent.last_heartbeat_at = datetime.now(timezone.utc)
        if data.system_info:
            agent.system_info = data.system_info
        if data.ip_address:
            agent.ip_address = data.ip_address
        if data.version:
            agent.version = data.version
            
        db.commit()
        db.refresh(agent)
        return agent

    @staticmethod
    def delete_agent(db: Session, agent_id: int, workspace_id: int):
        agent = AgentService.get_by_id(db, agent_id, workspace_id)
        db.delete(agent)
        db.commit()

    @staticmethod
    def is_group_active(db: Session, workspace_id: int, group_tag: str) -> bool:
        """
        Checks if there's at least one online agent matching the group tag.
        Dialect-agnostic implementation using Python-side filtering for reliability.
        """
        # 1. Fetch online agents for the workspace with a strict heartbeat window
        threshold = datetime.now(timezone.utc) - timedelta(minutes=2)
        
        online_agents = db.query(Agent).filter(
            Agent.workspace_id == workspace_id,
            Agent.status == AgentStatus.ONLINE,
            Agent.last_heartbeat_at >= threshold
        ).all()
        
        # 2. Perform tag matching in Python to handle different JSON implementations
        for agent in online_agents:
            if not agent.tags or not isinstance(agent.tags, dict):
                continue
                
            groups = agent.tags.get('groups', [])
            if isinstance(groups, list):
                if any(str(g).lower() == group_tag.lower() for g in groups):
                    return True
            elif isinstance(groups, str):
                if groups.lower() == group_tag.lower():
                    return True
                    
        return False
