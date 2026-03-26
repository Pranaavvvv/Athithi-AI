"""
Pydantic schemas for Event-related requests and responses.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import EventStatus, MenuTier


# ─── Request Schemas ───

class EventCreate(BaseModel):
    """Schema for creating a new event (Temporary Enquiry)."""
    party_name: str = Field(..., max_length=200)
    client_name: str = Field(..., max_length=200)
    client_phone: str = Field(..., max_length=20)
    client_email: Optional[str] = None
    gst_info: Optional[str] = None

    event_manager: Optional[str] = None
    event_date: datetime
    location: str = Field(..., max_length=300)
    guest_count: int = Field(..., ge=1)

    menu_tier: MenuTier = MenuTier.STANDARD
    addons_amount: Decimal = Decimal("0.00")
    gst_percentage: Decimal = Decimal("18.00")

    assigned_sales_id: Optional[UUID] = None


class EventUpdate(BaseModel):
    """Schema for updating event fields (Sales editing an enquiry)."""
    party_name: Optional[str] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    guest_count: Optional[int] = None
    menu_tier: Optional[MenuTier] = None
    addons_amount: Optional[Decimal] = None
    event_date: Optional[datetime] = None
    location: Optional[str] = None


# ─── Response Schemas ───

class EventResponse(BaseModel):
    """Full event response with computed fields."""
    id: UUID
    party_name: str
    client_name: str
    client_phone: str
    client_email: Optional[str]
    gst_info: Optional[str]

    event_manager: Optional[str]
    event_date: datetime
    location: str
    guest_count: int

    menu_tier: MenuTier
    addons_amount: Decimal
    gst_percentage: Decimal
    total_quoted_amount: Optional[Decimal]

    status: EventStatus
    is_active: bool
    pricing_recommendation: Optional[str]

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    """Lightweight event listing for dashboards."""
    id: UUID
    party_name: str
    client_name: str
    event_date: datetime
    location: str
    guest_count: int
    menu_tier: MenuTier
    status: EventStatus
    is_active: bool
    total_quoted_amount: Optional[Decimal]
    created_at: datetime

    model_config = {"from_attributes": True}
