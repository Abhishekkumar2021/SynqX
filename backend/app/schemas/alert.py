from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from synqx_core.models.enums import (
    AlertDeliveryMethod,
    AlertLevel,
    AlertStatus,
    AlertType,
)


class AlertConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    alert_type: AlertType
    delivery_method: AlertDeliveryMethod
    recipient: str = Field(..., min_length=1, max_length=255)
    threshold_value: int = 1
    threshold_window_minutes: int = 60
    enabled: bool = True
    cooldown_minutes: int = 60
    pipeline_filter: dict[str, Any] | None = None
    severity_filter: dict[str, Any] | None = None


class AlertConfigCreate(AlertConfigBase):
    pass


class AlertConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    alert_type: AlertType | None = None
    delivery_method: AlertDeliveryMethod | None = None
    recipient: str | None = None
    threshold_value: int | None = None
    threshold_window_minutes: int | None = None
    enabled: bool | None = None
    cooldown_minutes: int | None = None
    pipeline_filter: dict[str, Any] | None = None
    severity_filter: dict[str, Any] | None = None


class AlertConfigRead(AlertConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str | None = None
    last_triggered_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AlertRead(BaseModel):
    id: int
    alert_config_id: int | None = None
    pipeline_id: int | None = None
    job_id: int | None = None
    message: str
    level: AlertLevel
    status: AlertStatus
    delivery_method: AlertDeliveryMethod
    recipient: str
    sent_at: datetime | None = None
    acknowledged_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertUpdate(BaseModel):
    status: AlertStatus | None = None
    acknowledged_at: datetime | None = None
    acknowledged_by: str | None = None


class AlertListResponse(BaseModel):
    items: list[AlertRead]
    total: int
    limit: int
    offset: int
