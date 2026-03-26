"""
Financial Ledger model — tracks the 30/40/30 payment milestones for each event.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Enum, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.database import Base
from app.models.enums import PaymentMilestone, PaymentStatus


class FinancialLedger(Base):
    __tablename__ = "financial_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)

    # --- Milestone Info ---
    milestone = Column(Enum(PaymentMilestone), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)  # 30.00, 40.00, or 30.00

    # --- Financial ---
    amount_due = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=True, default=0.00)
    utr_number = Column(String(100), unique=True, nullable=True)

    # --- Status ---
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    due_date = Column(Date, nullable=False)

    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- Relationship ---
    event = relationship("Event", back_populates="ledger_entries")

    def __repr__(self):
        return f"<Ledger [{self.milestone.value}] {self.payment_status.value} — ₹{self.amount_due}>"
