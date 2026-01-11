import os
import subprocess
import json
import logging
from typing import Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from synqx_core.models.environment import Environment
from synqx_core.models.connections import Connection
from app.core.errors import AppError
from app.utils.agent import is_remote_group

logger = logging.getLogger(__name__)

class DependencyService:
    """
    Manages isolated execution environments for connections, persisting state in the DB.
    Automatically routes to remote agents if assigned.
    """
    
    BASE_ENV_PATH = "data/environments"

    def __init__(self, db: Session, connection_id: int, user_id: Optional[int] = None):
        self.db = db
        self.connection_id = connection_id
        self.user_id = user_id
        
        # Resolve routing
        self.connection = self.db.query(Connection).filter(Connection.id == connection_id).first()
        if not self.connection:
            raise AppError("Connection not found", status_code=404)
            
        self.agent_group = self.connection.workspace.default_agent_group if self.connection.workspace else "internal"
        self.is_remote = is_remote_group(self.agent_group)

        # Verify ownership if user_id is provided
        if user_id:
            self._ensure_ownership()
            
        self.base_env_path = os.path.abspath(os.path.join(self.BASE_ENV_PATH, str(connection_id)))
        if not self.is_remote:
            self._ensure_base_path()

    def _ensure_ownership(self):
        """Check if the user owns the connection or is workspace admin."""
        # Simple check for now
        if self.connection.user_id != self.user_id:
             # Check workspace member role
             from synqx_core.models.workspace import WorkspaceMember, WorkspaceRole
             member = self.db.query(WorkspaceMember).filter(
                 WorkspaceMember.workspace_id == self.connection.workspace_id,
                 WorkspaceMember.user_id == self.user_id
             ).first()
             if not member or member.role not in [WorkspaceRole.ADMIN, WorkspaceRole.EDITOR]:
                 raise AppError("Access denied", status_code=403)

    def _trigger_remote_task(self, payload: Dict):
        from app.services.ephemeral_service import EphemeralJobService
        from synqx_core.schemas.ephemeral import EphemeralJobCreate
        from synqx_core.models.enums import JobType, JobStatus
        import time

        job_in = EphemeralJobCreate(
            job_type=JobType.SYSTEM,
            connection_id=self.connection_id,
            payload=payload,
            agent_group=self.agent_group
        )
        job = EphemeralJobService.create_job(self.db, self.connection.workspace_id, self.user_id or 0, job_in)
        
        # Sync wait
        start = time.time()
        while time.time() - start < 60:
            self.db.expire_all()
            from synqx_core.models.ephemeral import EphemeralJob
            updated = self.db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(1)
            
        if updated.status == JobStatus.FAILED:
            raise AppError(f"Remote dependency task failed: {updated.error_message}")
        if updated.status != JobStatus.SUCCESS:
            raise AppError("Remote task timed out")
            
        return updated.result_summary

    def _ensure_base_path(self):
        if not os.path.exists(self.base_env_path):
            os.makedirs(self.base_env_path, exist_ok=True)

    def _get_lang_path(self, language: str) -> str:
        path = os.path.join(self.base_env_path, language)
        if not os.path.exists(path):
            os.makedirs(path, exist_ok=True)
        return path

    def get_environment(self, language: str) -> Optional[Environment]:
        return self.db.query(Environment).filter(
            Environment.connection_id == self.connection_id,
            Environment.language == language
        ).first()

    def initialize_environment(self, language: str) -> Environment:
        env = self.get_environment(language)
        
        if not env:
            env = Environment(
                connection_id=self.connection_id,
                language=language,
                path=self._get_lang_path(language) if not self.is_remote else f"agent://{language}",
                status="initializing"
            )
            self.db.add(env)
            self.db.commit()
            self.db.refresh(env)

        if self.is_remote:
            try:
                res = self._trigger_remote_task({"action": "initialize", "language": language})
                env.status = "ready"
                env.version = res.get("version", "Remote")
                env.updated_at = datetime.now(timezone.utc)
                self.db.commit()
                return env
            except Exception as e:
                env.status = "error"
                self.db.commit()
                raise AppError(str(e))

        try:
            path = self._get_lang_path(language)
            version = None
            if language == "python":
                venv_path = os.path.join(path, "venv")
                if not os.path.exists(venv_path):
                    subprocess.check_call(["python3", "-m", "venv", venv_path])
                python_exe = os.path.join(venv_path, "bin", "python")
                version = subprocess.check_output([python_exe, "--version"], text=True).strip()
            
            elif language == "node":
                package_json = os.path.join(path, "package.json")
                if not os.path.exists(package_json):
                    subprocess.check_call(["npm", "init", "-y"], cwd=path)
                version = subprocess.check_output(["node", "-v"], text=True).strip()

            env.status = "ready"
            env.version = version
            env.updated_at = datetime.now(timezone.utc)
            
            # Initial package list
            env.packages = self.list_packages(language)
            
            self.db.commit()
            return env

        except Exception as e:
            env.status = "error"
            logger.error(f"Isolated runtime initialization failed for {language} (Connection #{self.connection_id}): {e}")
            self.db.commit()
            raise AppError(f"Failed to initialize isolated {language.capitalize()} runtime: {str(e)}")

    def install_package(self, language: str, package_name: str) -> str:
        env = self.get_environment(language)
        if not env or env.status != "ready":
            raise AppError(f"{language.capitalize()} environment is not operational. Please initialize the runtime before installing packages.")

        if self.is_remote:
            res = self._trigger_remote_task({"action": "install", "language": language, "package": package_name})
            # Remote agents don't easily return full list yet, we'll mark for refresh or keep current
            env.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            return res.get("output", "Success")

        try:
            output = ""
            if language == "python":
                pip_exe = os.path.join(env.path, "venv", "bin", "pip")
                output = subprocess.check_output([pip_exe, "install", package_name], stderr=subprocess.STDOUT, text=True)
            elif language == "node":
                output = subprocess.check_output(["npm", "install", package_name, "--save"], cwd=env.path, stderr=subprocess.STDOUT, text=True)

            # Update cached package list
            env.packages = self.list_packages(language)
            env.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            return output
        except subprocess.CalledProcessError as e:
            raise AppError(f"Package installation failed for '{package_name}': {e.output}")

    def uninstall_package(self, language: str, package_name: str) -> str:
        env = self.get_environment(language)
        if not env or env.status != "ready":
            raise AppError(f"{language.capitalize()} environment is not operational. Please initialize the runtime before managing packages.")

        try:
            output = ""
            if language == "python":
                pip_exe = os.path.join(env.path, "venv", "bin", "pip")
                output = subprocess.check_output([pip_exe, "uninstall", "-y", package_name], stderr=subprocess.STDOUT, text=True)
            elif language == "node":
                output = subprocess.check_output(["npm", "uninstall", package_name, "--save"], cwd=env.path, stderr=subprocess.STDOUT, text=True)

            # Update cached package list
            env.packages = self.list_packages(language)
            env.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            return output
        except subprocess.CalledProcessError as e:
            raise AppError(f"Package removal failed for '{package_name}': {e.output}")

    def list_packages(self, language: str) -> Dict[str, str]:
        env = self.get_environment(language)
        if not env or env.status != "ready":
            return {}

        try:
            if language == "python":
                pip_exe = os.path.join(env.path, "venv", "bin", "pip")
                out = subprocess.check_output([pip_exe, "list", "--format=json"], text=True)
                return {pkg['name']: pkg['version'] for pkg in json.loads(out)}
            elif language == "node":
                out = subprocess.check_output(["npm", "list", "--depth=0", "--json"], cwd=env.path, text=True)
                deps = json.loads(out).get("dependencies", {})
                return {k: v.get("version", "unknown") for k, v in deps.items()}
            return env.packages or {}
        except Exception:
            return env.packages or {}

    def get_execution_context(self, language: str) -> Dict[str, str]:
        env = self.get_environment(language)
        if not env or env.status != "ready":
            return {}
            
        ctx = {"env_path": env.path}
        if language == "python":
            ctx["python_executable"] = os.path.join(env.path, "venv", "bin", "python")
        elif language == "node":
            ctx["node_cwd"] = env.path
            
        return ctx