import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta = None) -> str:  # noqa: RUF013
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"sub": str(subject), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_api_key_hash(api_key: str) -> str:
    """
    Hash an API key using SHA256.
    Fast and secure enough for high-entropy random keys.
    """
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def verify_api_key_hash(plain_api_key: str, hashed_api_key: str) -> bool:
    """
    Verify an API key hash using constant-time comparison.
    """
    return secrets.compare_digest(get_api_key_hash(plain_api_key), hashed_api_key)


def _prepare_password(password: str) -> bytes:
    """
    Prepare password for bcrypt hashing.
    For passwords longer than 72 bytes, use SHA256 pre-hash.
    """
    password_bytes = password.encode("utf-8")

    # If password is within bcrypt's limit, use it directly
    if len(password_bytes) <= 72:  # noqa: PLR2004
        return password_bytes

    # For longer passwords, use SHA256 hash
    # This maintains security while staying within bcrypt's limits
    return hashlib.sha256(password_bytes).hexdigest().encode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its bcrypt hash.
    Handles passwords of any length using SHA256 pre-hashing for long passwords.
    """
    try:
        password_bytes = _prepare_password(plain_password)
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    Automatically handles passwords longer than 72 bytes.
    """
    password_bytes = _prepare_password(password)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")
