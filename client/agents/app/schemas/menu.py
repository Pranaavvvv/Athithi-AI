"""
Pydantic schemas for Menu-related requests and responses.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import MenuTier


class MenuItemResponse(BaseModel):
    """Single menu item response."""
    id: UUID
    tier: MenuTier
    category: str
    item_name: str
    price_per_guest: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TierPricingSummary(BaseModel):
    """Per-tier pricing aggregate."""
    tier: str
    total_items: int
    base_rate_per_guest: Decimal
    categories: dict  # category -> subtotal


class MenuUploadResponse(BaseModel):
    """Response after CSV upload."""
    success: bool
    message: str
    items_loaded: int
    tier_summary: List[TierPricingSummary]
