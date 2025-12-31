from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserLogin(BaseModel):
    username: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(
        ..., 
        min_length=8,
        max_length=128,  # Allow longer than 72 for user input, we'll truncate in hashing
        description="Password must be at least 8 characters"
    )
    full_name: Optional[str] = Field(None, max_length=255)
    is_superuser: bool = False
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets minimum requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Warn if password is too long (will be truncated)
        if len(v.encode('utf-8')) > 72:
            # This is fine, we'll truncate it, but could add a warning in logs
            pass
            
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Ensure email is lowercase."""
        return v.lower()

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    email: Optional[EmailStr] = None

class UserRead(BaseModel):

    id: int

    email: EmailStr

    full_name: Optional[str] = None

    is_active: bool = True

    is_superuser: bool = False

    active_workspace_id: Optional[int] = None

    

    class Config:

        from_attributes = True
