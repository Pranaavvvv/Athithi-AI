"""
Finance Router — The Gatekeeper.
Handles installment plans, UTR verification, confirmation toggle, and payment nudges.
Integrates Featherless.ai for Price Sensitivity Analysis and WhatsApp for notifications.
"""

import logging
from datetime import timedelta
from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.event import Event
from app.models.financial_ledger import FinancialLedger
from app.models.menu_item import MenuItem
from app.models.enums import EventStatus, PaymentMilestone, PaymentStatus
from app.schemas.event import EventCreate, EventResponse, EventListResponse, EventUpdate
from app.schemas.finance import (
    InitPlanRequest,
    VerifyUTRRequest,
    ConfirmEventRequest,
    ConfirmationResponse,
    LedgerEntryResponse,
    FinanceDashboardEntry,
)
from app.services import featherless, whatsapp

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────
# EVENT CRUD (Sales / Event Manager)
# ─────────────────────────────────────────────

@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    """Create a new Temporary Enquiry."""
    event = Event(**payload.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


@router.get("/events", response_model=List[EventListResponse])
async def list_events(
    status_filter: EventStatus = None,
    db: AsyncSession = Depends(get_db),
):
    """List all events, optionally filtered by status."""
    query = select(Event).order_by(Event.created_at.desc())
    if status_filter:
        query = query.where(Event.status == status_filter)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get full event details by ID."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


@router.patch("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: UUID, payload: EventUpdate, db: AsyncSession = Depends(get_db)):
    """Update event fields (only while status is 'enquiry')."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    if event.status != EventStatus.ENQUIRY:
        raise HTTPException(status_code=400, detail="Cannot edit event after it has been booked.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    await db.flush()
    await db.refresh(event)
    return event


# ─────────────────────────────────────────────
# INIT PLAN — Generate the 30/40/30 Ledger
# ─────────────────────────────────────────────

@router.post("/init-plan", response_model=List[LedgerEntryResponse], status_code=status.HTTP_201_CREATED)
async def init_installment_plan(payload: InitPlanRequest, db: AsyncSession = Depends(get_db)):
    """
    Auto-calculate the total cost and create 3 ledger rows:
    - 30% Booking Deposit (immediate)
    - 40% Mid-Term (event_date - 30 days)
    - 30% Final Settlement (event_date - 7 days)
    """
    # Fetch the event
    result = await db.execute(select(Event).where(Event.id == payload.event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    # Check if plan already exists
    existing = await db.execute(
        select(FinancialLedger).where(FinancialLedger.event_id == payload.event_id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Installment plan already exists for this event.")

    # Auto-lookup base rate from menu_items table
    menu_result = await db.execute(
        select(MenuItem).where(
            MenuItem.tier == event.menu_tier,
            MenuItem.is_active == True,
        )
    )
    menu_items = menu_result.scalars().all()
    if not menu_items:
        raise HTTPException(
            status_code=400,
            detail=f"No menu items found for tier '{event.menu_tier.value}'. Upload a pricing CSV first via /api/menu/upload-csv.",
        )

    base_rate_per_guest = sum(item.price_per_guest for item in menu_items)

    # Calculate total: (base_rate × guest_count) + addons + GST
    subtotal = (base_rate_per_guest * event.guest_count) + event.addons_amount
    gst_amount = subtotal * (event.gst_percentage / Decimal("100"))
    total = subtotal + gst_amount

    # Update event's total_quoted_amount
    event.total_quoted_amount = total

    # Define milestones
    milestones = [
        {
            "milestone": PaymentMilestone.DEPOSIT,
            "percentage": Decimal("30.00"),
            "amount_due": round(total * Decimal("0.30"), 2),
            "due_date": event.created_at.date(),  # Immediate
        },
        {
            "milestone": PaymentMilestone.MID_TERM,
            "percentage": Decimal("40.00"),
            "amount_due": round(total * Decimal("0.40"), 2),
            "due_date": (event.event_date - timedelta(days=30)).date(),
        },
        {
            "milestone": PaymentMilestone.FINAL,
            "percentage": Decimal("30.00"),
            "amount_due": round(total * Decimal("0.30"), 2),
            "due_date": (event.event_date - timedelta(days=7)).date(),
        },
    ]

    ledger_entries = []
    for m in milestones:
        entry = FinancialLedger(event_id=event.id, **m)
        db.add(entry)
        ledger_entries.append(entry)

    await db.flush()
    for entry in ledger_entries:
        await db.refresh(entry)

    # ─── LLM: Price Sensitivity Analysis ───
    try:
        recommendation = await featherless.analyze_price_sensitivity(
            guest_count=event.guest_count,
            menu_tier=event.menu_tier.value,
            total_quoted=float(total),
            event_date=event.event_date.strftime("%d %b %Y"),
            location=event.location,
        )
        event.pricing_recommendation = recommendation
        await db.flush()
    except Exception as e:
        logger.warning(f"Featherless.ai pricing analysis failed: {e}")

    return ledger_entries


# ─────────────────────────────────────────────
# VERIFY UTR — Record bank transaction reference
# ─────────────────────────────────────────────

@router.patch("/verify-utr", response_model=LedgerEntryResponse)
async def verify_utr(payload: VerifyUTRRequest, db: AsyncSession = Depends(get_db)):
    """
    Save UTR number against a ledger entry and transition payment status.
    """
    # Fetch ledger entry
    result = await db.execute(
        select(FinancialLedger).where(FinancialLedger.id == payload.ledger_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found.")

    if entry.payment_status == PaymentStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="This milestone is already verified.")

    # Check UTR uniqueness
    existing_utr = await db.execute(
        select(FinancialLedger).where(FinancialLedger.utr_number == payload.utr_number)
    )
    if existing_utr.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"UTR '{payload.utr_number}' is already recorded.")

    # Update
    entry.utr_number = payload.utr_number
    entry.payment_status = PaymentStatus.VERIFIED
    if payload.amount_paid is not None:
        entry.amount_paid = payload.amount_paid
    else:
        entry.amount_paid = entry.amount_due

    await db.flush()
    await db.refresh(entry)
    return entry


# ─────────────────────────────────────────────
# CONFIRM — The Critical Toggle
# ─────────────────────────────────────────────

@router.post("/confirm", response_model=ConfirmationResponse)
async def confirm_event(payload: ConfirmEventRequest, db: AsyncSession = Depends(get_db)):
    """
    The Confirmation Toggle.
    Requires: 30% Deposit milestone must be 'verified'.
    Actions: Flips event status to 'Booked', generates PO, triggers WhatsApp.
    """
    # Fetch event
    result = await db.execute(select(Event).where(Event.id == payload.event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if event.status != EventStatus.ENQUIRY:
        raise HTTPException(
            status_code=400,
            detail=f"Event is already '{event.status.value}'. Confirmation only applies to enquiries."
        )

    # Check the 30% deposit milestone
    deposit_result = await db.execute(
        select(FinancialLedger).where(
            FinancialLedger.event_id == payload.event_id,
            FinancialLedger.milestone == PaymentMilestone.DEPOSIT,
        )
    )
    deposit = deposit_result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(status_code=400, detail="No installment plan found. Run /init-plan first.")

    if deposit.payment_status != PaymentStatus.VERIFIED:
        raise HTTPException(
            status_code=403,
            detail="Cannot confirm: 30% Booking Deposit has not been verified. Record a UTR first."
        )

    # ─── Execute the Toggle ───
    event.status = EventStatus.BOOKED
    event.is_active = True

    await db.flush()

    # ─── Send WhatsApp Purchase Order ───
    whatsapp_sent = False
    try:
        wa_result = await whatsapp.send_purchase_order(
            to_phone=event.client_phone,
            party_name=event.party_name,
            total=float(event.total_quoted_amount or 0),
            deposit_paid=float(deposit.amount_paid or 0),
            event_date=event.event_date.strftime("%d %b %Y, %I:%M %p"),
        )
        whatsapp_sent = wa_result.get("sent", False)
    except Exception as e:
        logger.warning(f"WhatsApp PO delivery failed: {e}")

    return ConfirmationResponse(
        event_id=event.id,
        new_status=event.status.value,
        is_active=event.is_active,
        message="Event confirmed and booked successfully!",
        po_generated=True,
        whatsapp_sent=whatsapp_sent,
    )


# ─────────────────────────────────────────────
# NUDGE — WhatsApp Payment Reminder
# ─────────────────────────────────────────────

@router.post("/nudge/{event_id}")
async def nudge_client(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Send a WhatsApp payment reminder for the next unpaid milestone.
    """
    # Find the next unpaid milestone
    result = await db.execute(
        select(FinancialLedger)
        .where(
            FinancialLedger.event_id == event_id,
            FinancialLedger.payment_status != PaymentStatus.VERIFIED,
        )
        .order_by(FinancialLedger.due_date.asc())
        .limit(1)
    )
    next_milestone = result.scalar_one_or_none()

    if not next_milestone:
        return {"message": "All milestones are verified. No nudge needed."}

    # Fetch event for client phone
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    # ─── Send WhatsApp Reminder ───
    wa_sent = False
    try:
        wa_result = await whatsapp.send_payment_reminder(
            to_phone=event.client_phone,
            party_name=event.party_name,
            milestone=next_milestone.milestone.value,
            amount_due=float(next_milestone.amount_due),
            due_date=str(next_milestone.due_date),
        )
        wa_sent = wa_result.get("sent", False)
    except Exception as e:
        logger.warning(f"WhatsApp nudge failed: {e}")

    return {
        "message": f"Nudge sent for {next_milestone.milestone.value} milestone.",
        "client_phone": event.client_phone,
        "amount_due": str(next_milestone.amount_due),
        "due_date": str(next_milestone.due_date),
        "whatsapp_sent": wa_sent,
    }


# ─────────────────────────────────────────────
# DASHBOARD — Finance Manager Overview
# ─────────────────────────────────────────────

@router.get("/dashboard", response_model=List[FinanceDashboardEntry])
async def finance_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Aggregated financial dashboard for the Finance Manager.
    Shows all events with payment summaries.
    """
    events_result = await db.execute(
        select(Event).options(selectinload(Event.ledger_entries)).order_by(Event.created_at.desc())
    )
    events = events_result.scalars().unique().all()

    dashboard = []
    for event in events:
        total_paid = sum(
            (entry.amount_paid or Decimal("0")) for entry in event.ledger_entries
            if entry.payment_status == PaymentStatus.VERIFIED
        )
        total_due = sum(
            entry.amount_due for entry in event.ledger_entries
            if entry.payment_status != PaymentStatus.VERIFIED
        )

        # Find next unpaid milestone
        unpaid = sorted(
            [e for e in event.ledger_entries if e.payment_status != PaymentStatus.VERIFIED],
            key=lambda e: e.due_date,
        )

        dashboard.append(FinanceDashboardEntry(
            event_id=event.id,
            party_name=event.party_name,
            client_name=event.client_name,
            event_date=event.event_date,
            status=event.status.value,
            total_quoted=event.total_quoted_amount,
            total_paid=total_paid,
            total_due=total_due,
            next_milestone=unpaid[0].milestone.value if unpaid else None,
            next_due_date=unpaid[0].due_date if unpaid else None,
        ))

    return dashboard


# ─────────────────────────────────────────────
# LEDGER — Get all entries for an event
# ─────────────────────────────────────────────

@router.get("/ledger/{event_id}", response_model=List[LedgerEntryResponse])
async def get_event_ledger(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all financial ledger entries for a specific event."""
    result = await db.execute(
        select(FinancialLedger)
        .where(FinancialLedger.event_id == event_id)
        .order_by(FinancialLedger.due_date.asc())
    )
    entries = result.scalars().all()
    if not entries:
        raise HTTPException(status_code=404, detail="No ledger entries found for this event.")
    return entries
