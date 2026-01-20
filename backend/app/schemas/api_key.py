from datetime import datetime

from pydantic import BaseModel, Field


class ApiKeyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: str | None = Field(None, description="Comma-separated list of scopes")
    expires_in_days: int | None = Field(
        None, ge=1, description="Expiration in days. If null, never expires."
    )


class ApiKeyCreate(ApiKeyBase):
    pass


class ApiKeyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    is_active: bool | None = None


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    scopes: str | None
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None
    is_active: bool

    class Config:
        from_attributes = True


class ApiKeyCreated(ApiKeyResponse):
    key: str  # The full API key, returned only once!
