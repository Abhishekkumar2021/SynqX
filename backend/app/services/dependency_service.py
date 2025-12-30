import os
import subprocess
import json
import logging
from typing import Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.environment import Environment
from app.models.connections import Connection
from app.core.errors import AppError

logger = logging.getLogger(__name__)

class DependencyService:
    """
    Manages isolated execution environments for connections, persisting state in the DB.
    """
    
    BASE_ENV_PATH = "data/environments"

    def __init__(self, db: Session, connection_id: int, user_id: Optional[int] = None):
        self.db = db
        self.connection_id = connection_id
        self.user_id = user_id
        
        # Verify ownership if user_id is provided
        if user_id:
            self._ensure_ownership()
            
        self.base_env_path = os.path.abspath(os.path.join(self.BASE_ENV_PATH, str(connection_id)))
        self._ensure_base_path()

    def _ensure_ownership(self):
        """Check if the user owns the connection."""
        conn = self.db.query(Connection).filter(
            Connection.id == self.connection_id,
            Connection.user_id == self.user_id
        ).first()
        if not conn:
            raise AppError("Connection not found or access denied", status_code=404)

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
        path = self._get_lang_path(language)
        env = self.get_environment(language)
        
        if not env:
            env = Environment(
                connection_id=self.connection_id,
                language=language,
                path=path,
                status="initializing"
            )
            self.db.add(env)
            self.db.commit()
            self.db.refresh(env)

        try:
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
            logger.error(f"Failed to initialize {language} env for connection {self.connection_id}: {e}")
            self.db.commit()
            raise AppError(f"Initialization failed: {str(e)}")

    def install_package(self, language: str, package_name: str) -> str:
        env = self.get_environment(language)
        if not env or env.status != "ready":
            raise AppError(f"{language} environment is not ready. Please initialize it first.")

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
            raise AppError(f"Installation failed: {e.output}")

    def uninstall_package(self, language: str, package_name: str) -> str:
        env = self.get_environment(language)
        if not env or env.status != "ready":
            raise AppError(f"{language} environment is not ready. Please initialize it first.")

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
            raise AppError(f"Uninstallation failed: {e.output}")

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