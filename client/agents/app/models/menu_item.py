"""
MenuItem model — stores individual menu items loaded from the CSV pricing sheet.
Each item belongs to a tier (Standard/Premium/Elite) and contributes to the per-guest base rate.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.enums import MenuTier


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # --- Menu Details ---
    tier = Column(Enum(MenuTier), nullable=False)
    category = Column(String(100), nullable=False)  # starter, main_course, dessert, beverage
    item_name = Column(String(200), nullable=False)
    price_per_guest = Column(Numeric(10, 2), nullable=False)

    # --- Status ---
    is_active = Column(Boolean, default=True)

    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<MenuItem [{self.tier.value}] {self.item_name} — ₹{self.price_per_guest}/guest>"
