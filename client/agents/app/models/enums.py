"""
Enum definitions for the Banquet Intelli-Manager state machine.
These enforce strict status progression across the system.
"""

import enum


class EventStatus(str, enum.Enum):
    """
    Strict state-machine for event lifecycle.
    enquiry -> booked -> operating -> completed
    """
    ENQUIRY = "enquiry"
    BOOKED = "booked"
    OPERATING = "operating"
    COMPLETED = "completed"


class PaymentStatus(str, enum.Enum):
    """
    Payment milestone progression.
    pending -> submitted -> verified
    """
    PENDING = "pending"
    SUBMITTED = "submitted"
    VERIFIED = "verified"


class VendorPayoutStatus(str, enum.Enum):
    """
    Vendor bill approval flow.
    pending -> approved -> paid
    """
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"


class MenuTier(str, enum.Enum):
    """Menu pricing tiers."""
    STANDARD = "standard"
    PREMIUM = "premium"
    ELITE = "elite"


class PaymentMilestone(str, enum.Enum):
    """The 30/40/30 payment schedule milestones."""
    DEPOSIT = "deposit"         # 30% — Immediate booking deposit
    MID_TERM = "mid_term"       # 40% — Event date minus 30 days
    FINAL = "final"             # 30% — Event date minus 7 days
