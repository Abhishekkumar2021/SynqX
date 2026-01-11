from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ApiKeyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: Optional[str] = Field(None, description="Comma-separated list of scopes")
    expires_in_days: Optional[int] = Field(None, ge=1, description="Expiration in days. If null, never expires.")

class ApiKeyCreate(ApiKeyBase):
    pass

class ApiKeyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None

class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    scopes: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True

class ApiKeyCreated(ApiKeyResponse):
    key: str  # The full API key, returned only once!
