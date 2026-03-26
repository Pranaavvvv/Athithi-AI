"""
Pydantic schemas for Finance-related requests and responses.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import PaymentMilestone, PaymentStatus


# ─── Request Schemas ───

class InitPlanRequest(BaseModel):
    """Request to initialize the 30/40/30 installment plan for an event."""
    event_id: UUID
    # base_rate_per_guest is now auto-derived from the event's menu_tier via menu_items table


class VerifyUTRRequest(BaseModel):
    """Request to record a UTR number against a ledger entry."""
    ledger_id: UUID
    utr_number: str = Field(..., max_length=100)
    amount_paid: Optional[Decimal] = None


class ConfirmEventRequest(BaseModel):
    """Request to toggle event status from Enquiry to Booked."""
    event_id: UUID


class NudgeRequest(BaseModel):
    """Override phone number for payment reminder (optional)."""
    override_phone: Optional[str] = None


# ─── Response Schemas ───

class LedgerEntryResponse(BaseModel):
    """Single ledger row response."""
    id: UUID
    event_id: UUID
    milestone: PaymentMilestone
    percentage: Decimal
    amount_due: Decimal
    amount_paid: Optional[Decimal]
    utr_number: Optional[str]
    payment_status: PaymentStatus
    due_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinanceDashboardEntry(BaseModel):
    """Aggregated view for the Finance Manager dashboard."""
    event_id: UUID
    party_name: str
    client_name: str
    event_date: datetime
    status: str
    total_quoted: Optional[Decimal]
    total_paid: Decimal
    total_due: Decimal
    next_milestone: Optional[str]
    next_due_date: Optional[date]

    model_config = {"from_attributes": True}


class ConfirmationResponse(BaseModel):
    """Response after triggering the Confirmation Toggle."""
    event_id: UUID
    new_status: str
    is_active: bool
    message: str
    po_generated: bool
    whatsapp_sent: bool
