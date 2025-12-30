from typing import Dict, Any
import json
import base64
import hashlib
from cryptography.fernet import Fernet

from app.models.connections import Connection
from app.core.errors import AppError, ConfigurationError
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class VaultService:
    """
    Service for securely handling connector configurations using encryption at rest.
    Configurations are encrypted using a key derived from settings.MASTER_PASSWORD
    and stored in the database's 'config_encrypted' column.
    """

    @staticmethod
    def _get_cipher_suite() -> Fernet:
        """
        Generates a Fernet cipher suite derived from the MASTER_PASSWORD.
        We use SHA256 to ensure we have a 32-byte key, then base64 encode it.
        """
        try:
            key = hashlib.sha256(settings.MASTER_PASSWORD.encode()).digest()
            key_b64 = base64.urlsafe_b64encode(key)
            return Fernet(key_b64)
        except Exception as e:
            logger.critical(f"Failed to initialize encryption cipher: {e}")
            raise AppError("System security initialization failed.") from e

    @classmethod
    def encrypt_config(cls, config: Dict[str, Any]) -> str:
        """
        Encrypts a configuration dictionary.

        Args:
            config: The configuration dictionary to encrypt.

        Returns:
            The encrypted configuration string.
        """
        try:
            cipher = cls._get_cipher_suite()
            json_str = json.dumps(config)
            encrypted_bytes = cipher.encrypt(json_str.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to encrypt configuration: {e}")
            raise AppError(f"Configuration encryption failed: {e}") from e

    @classmethod
    def decrypt_config(cls, encrypted_config: str) -> Dict[str, Any]:
        """
        Decrypts an encrypted configuration string.

        Args:
            encrypted_config: The encrypted configuration string.

        Returns:
            The decrypted configuration dictionary.
        """
        try:
            cipher = cls._get_cipher_suite()
            decrypted_bytes = cipher.decrypt(encrypted_config.encode('utf-8'))
            return json.loads(decrypted_bytes.decode('utf-8'))
        except Exception as e:
            logger.error(f"Failed to decrypt configuration: {e}")
            raise AppError(f"Configuration decryption failed: {e}") from e

    @classmethod
    def get_connector_config(cls, connection: Connection) -> Dict[str, Any]:
        """
        Retrieves the decrypted configuration for a given connection.

        Args:
            connection: The Connection ORM object.

        Returns:
            A dictionary containing the connector configuration.
        """
        if not connection.config_encrypted:
             # Fallback or error if no config is present
             # In a real migration scenario, you might check for legacy fields
             raise ConfigurationError(f"No configuration found for connection {connection.id}")

        try:
            decrypted_config = cls.decrypt_config(connection.config_encrypted)
            
            # Merge metadata
            full_config = {
                "id": connection.id,
                "name": connection.name,
                "connector_type": connection.connector_type.value,
                **decrypted_config
            }
            return full_config
        except AppError:
            raise
        except Exception as e:
            raise AppError(f"Failed to retrieve connector configuration for {connection.id}: {e}") from e