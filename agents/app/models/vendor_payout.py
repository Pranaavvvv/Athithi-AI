"""
Vendor Payout model — tracks operational expenses with AI-verified fraud detection.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.database import Base
from app.models.enums import VendorPayoutStatus


class VendorPayout(Base):
    __tablename__ = "vendor_payouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)

    # --- Vendor Info ---
    vendor_name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)

    # --- Financial ---
    bill_amount = Column(Numeric(12, 2), nullable=False)           # Claimed by Event Manager
    ai_verified_amount = Column(Numeric(12, 2), nullable=True)     # Extracted by Featherless.ai OCR

    # --- Fraud Detection ---
    discrepancy_flag = Column(Boolean, default=False)  # True if claimed != AI-extracted
    discrepancy_note = Column(String(500), nullable=True)

    # --- Status ---
    status = Column(Enum(VendorPayoutStatus), nullable=False, default=VendorPayoutStatus.PENDING)

    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- Relationship ---
    event = relationship("Event", back_populates="vendor_payouts")

    def __repr__(self):
        return f"<VendorPayout {self.vendor_name} — ₹{self.bill_amount} [{self.status.value}]>"
