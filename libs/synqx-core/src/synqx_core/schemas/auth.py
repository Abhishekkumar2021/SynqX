from pydantic import BaseModel, EmailStr, Field, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: str | None = None


class UserLogin(BaseModel):
    username: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,  # Allow longer than 72 for user input, we'll truncate in hashing  # noqa: E501
        description="Password must be at least 8 characters",
    )
    full_name: str | None = Field(None, max_length=255)
    is_superuser: bool = False

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets minimum requirements."""
        if len(v) < 8:  # noqa: PLR2004
            raise ValueError("Password must be at least 8 characters long")

        # Warn if password is too long (will be truncated)
        if len(v.encode("utf-8")) > 72:  # noqa: PLR2004
            # This is fine, we'll truncate it, but could add a warning in logs
            pass

        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Ensure email is lowercase."""
        return v.lower()


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=255)
    password: str | None = Field(None, min_length=8, max_length=128)
    email: EmailStr | None = None


class UserRead(BaseModel):
    id: int

    email: EmailStr

    full_name: str | None = None

    is_active: bool = True

    is_superuser: bool = False

    active_workspace_id: int | None = None

    class Config:
        from_attributes = True
