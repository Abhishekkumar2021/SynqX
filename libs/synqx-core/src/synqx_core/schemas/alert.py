from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from synqx_core.models.enums import AlertType, AlertDeliveryMethod, AlertLevel, AlertStatus

class AlertConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    alert_type: AlertType
    delivery_method: AlertDeliveryMethod
    recipient: str = Field(..., min_length=1, max_length=255)
    threshold_value: int = 1
    threshold_window_minutes: int = 60
    enabled: bool = True
    cooldown_minutes: int = 60
    pipeline_filter: Optional[Dict[str, Any]] = None
    severity_filter: Optional[Dict[str, Any]] = None

class AlertConfigCreate(AlertConfigBase):
    pass

class AlertConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    alert_type: Optional[AlertType] = None
    delivery_method: Optional[AlertDeliveryMethod] = None
    recipient: Optional[str] = None
    threshold_value: Optional[int] = None
    threshold_window_minutes: Optional[int] = None
    enabled: Optional[bool] = None
    cooldown_minutes: Optional[int] = None
    pipeline_filter: Optional[Dict[str, Any]] = None
    severity_filter: Optional[Dict[str, Any]] = None

class AlertConfigRead(AlertConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    last_triggered_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AlertRead(BaseModel):
    id: int
    alert_config_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    job_id: Optional[int] = None
    message: str
    level: AlertLevel
    status: AlertStatus
    delivery_method: AlertDeliveryMethod
    recipient: str
    sent_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

class AlertListResponse(BaseModel):
    items: List[AlertRead]
    total: int
    limit: int
    offset: int
