"""
Event model — the core entity tracking the full lifecycle of a banquet booking.
"""

import uuid
from datetime import datetime
import secrets

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import EventStatus, MenuTier


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_token = Column(String(100), unique=True, default=lambda: secrets.token_urlsafe(16))

    # --- Client Details ---
    party_name = Column(String(200), nullable=False)
    client_name = Column(String(200), nullable=False)
    client_phone = Column(String(20), nullable=False)
    client_email = Column(String(200), nullable=True)
    gst_info = Column(String(50), nullable=True)

    # --- Event Details ---
    event_manager = Column(String(200), nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(300), nullable=False)
    guest_count = Column(Integer, nullable=False, default=100)

    # --- Menu & Pricing ---
    menu_tier = Column(Enum(MenuTier), nullable=False, default=MenuTier.STANDARD)
    addons_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    gst_percentage = Column(Numeric(5, 2), nullable=False, default=18.00)
    total_quoted_amount = Column(Numeric(12, 2), nullable=True)

    # --- State Machine ---
    status = Column(Enum(EventStatus), nullable=False, default=EventStatus.ENQUIRY)
    is_active = Column(Boolean, default=False)  # Flips TRUE only on 'Booked'
    verify_entries = Column(Boolean, nullable=False, default=True, server_default=text('true'))  # Forces guest tracking RSVP approval

    # --- AI Notes ---
    pricing_recommendation = Column(Text, nullable=True)  # LLM-generated pricing advice

    # --- Ownership ---
    assigned_sales_id = Column(UUID(as_uuid=True), nullable=True)

    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- Relationships ---
    ledger_entries = relationship("FinancialLedger", back_populates="event", cascade="all, delete-orphan")
    vendor_payouts = relationship("VendorPayout", back_populates="event", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Event {self.party_name} [{self.status.value}]>"
