"""
Pydantic schemas for Operations-related requests and responses.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import VendorPayoutStatus


# ─── Request Schemas ───

class VendorBillCreate(BaseModel):
    """Request to submit a vendor bill for finance review."""
    event_id: UUID
    vendor_name: str = Field(..., max_length=200)
    description: Optional[str] = None
    bill_amount: Decimal = Field(..., description="Claimed amount by Event Manager")
    # bill_image_url can be added when file uploads are implemented


class VendorApproveRequest(BaseModel):
    """Finance approving a vendor payout."""
    payout_id: UUID


# ─── Response Schemas ───

class VendorPayoutResponse(BaseModel):
    """Vendor payout entry response."""
    id: UUID
    event_id: UUID
    vendor_name: str
    description: Optional[str]
    bill_amount: Decimal
    ai_verified_amount: Optional[Decimal]
    discrepancy_flag: bool
    discrepancy_note: Optional[str]
    status: VendorPayoutStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FPGenerationResponse(BaseModel):
    """Response after attempting Function Prospectus generation."""
    event_id: UUID
    success: bool
    message: str
    revenue_percentage: Decimal
    fp_content: Optional[str] = None  # LLM-generated FP text
