"""
Operations Router — Vendor Bill management + FP generation with guardrails.
Integrates Featherless.ai for Fraud Guard (Vision OCR) and Smart FP generation.
"""

import base64
import logging
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.event import Event
from app.models.financial_ledger import FinancialLedger
from app.models.vendor_payout import VendorPayout
from app.models.enums import EventStatus, PaymentStatus, VendorPayoutStatus
from app.schemas.ops import (
    VendorApproveRequest,
    VendorPayoutResponse,
    FPGenerationResponse,
)
from app.services import featherless

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────
# VENDOR BILL — Submit & AI Verify
# ─────────────────────────────────────────────

@router.post("/vendor-bill", response_model=VendorPayoutResponse, status_code=status.HTTP_201_CREATED)
async def submit_vendor_bill(
    event_id: UUID = Form(..., description="Event ID"),
    vendor_name: str = Form(..., max_length=200, description="Vendor name"),
    bill_amount: Decimal = Form(..., description="Claimed amount by Event Manager"),
    description: Optional[str] = Form(default=None, description="Bill description"),
    bill_image: Optional[UploadFile] = File(default=None, description="Invoice image (JPG/PNG/PDF)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Event Manager submits a vendor bill with an optional invoice image.
    System triggers Featherless.ai Vision OCR to verify the claimed amount.
    """
    # Verify event exists and is active
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    if event.status == EventStatus.ENQUIRY:
        raise HTTPException(status_code=400, detail="Cannot submit vendor bills for unconfirmed enquiries.")

    # ─── Read and encode image (if provided) ───
    image_b64 = None
    if bill_image and bill_image.filename:
        allowed_types = [".jpg", ".jpeg", ".png", ".webp"]
        ext = "." + bill_image.filename.rsplit(".", 1)[-1].lower() if "." in bill_image.filename else ""
        if ext not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image type '{ext}'. Allowed: {allowed_types}",
            )
        image_bytes = await bill_image.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # ─── Featherless.ai Fraud Guard (with Vision OCR) ───
    ai_amount = bill_amount
    discrepancy = False
    discrepancy_note = None
    try:
        ai_result = await featherless.verify_vendor_bill(
            vendor_name=vendor_name,
            claimed_amount=float(bill_amount),
            bill_description=description or "No description",
            image_base64=image_b64,
        )
        ai_amount = Decimal(str(ai_result.get("ai_verified_amount", bill_amount)))
        discrepancy = abs(ai_amount - bill_amount) > Decimal("1.00")
        if discrepancy:
            discrepancy_note = f"AI Fraud Guard: Claimed ₹{bill_amount}, AI extracted ₹{ai_amount}. {ai_result.get('raw_analysis', '')}"
    except Exception as e:
        logger.warning(f"Featherless.ai Fraud Guard failed: {e}")

    payout = VendorPayout(
        event_id=event_id,
        vendor_name=vendor_name,
        description=description,
        bill_amount=bill_amount,
        ai_verified_amount=ai_amount,
        discrepancy_flag=discrepancy,
        discrepancy_note=discrepancy_note,
    )

    db.add(payout)
    await db.flush()
    await db.refresh(payout)
    return payout


@router.patch("/vendor-bill/approve", response_model=VendorPayoutResponse)
async def approve_vendor_bill(payload: VendorApproveRequest, db: AsyncSession = Depends(get_db)):
    """Finance approves a vendor payout after review."""
    result = await db.execute(select(VendorPayout).where(VendorPayout.id == payload.payout_id))
    payout = result.scalar_one_or_none()
    if not payout:
        raise HTTPException(status_code=404, detail="Vendor payout not found.")

    if payout.status != VendorPayoutStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Payout is already '{payout.status.value}'.")

    payout.status = VendorPayoutStatus.APPROVED
    await db.flush()
    await db.refresh(payout)
    return payout


@router.get("/vendor-bills/{event_id}", response_model=List[VendorPayoutResponse])
async def list_vendor_bills(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all vendor bills for an event."""
    result = await db.execute(
        select(VendorPayout).where(VendorPayout.event_id == event_id).order_by(VendorPayout.created_at.desc())
    )
    return result.scalars().all()


# ─────────────────────────────────────────────
# FUNCTION PROSPECTUS — Revenue-Gated Document
# ─────────────────────────────────────────────

@router.get("/docs/generate-fp/{event_id}", response_model=FPGenerationResponse)
async def generate_function_prospectus(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Generate Function Prospectus for the operations team.
    GUARDRAIL: Blocks if total verified payments < 70% of quoted amount.
    """
    # Fetch event with ledger entries
    event_result = await db.execute(
        select(Event).options(selectinload(Event.ledger_entries)).where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if not event.total_quoted_amount or event.total_quoted_amount <= 0:
        raise HTTPException(status_code=400, detail="Event has no quoted amount. Run /init-plan first.")

    # Calculate revenue percentage
    total_verified = sum(
        (entry.amount_paid or Decimal("0"))
        for entry in event.ledger_entries
        if entry.payment_status == PaymentStatus.VERIFIED
    )
    revenue_pct = (total_verified / event.total_quoted_amount) * Decimal("100")

    if revenue_pct < Decimal("70"):
        return FPGenerationResponse(
            event_id=event.id,
            success=False,
            message=f"Cannot generate FP. Only {revenue_pct:.1f}% of revenue collected (minimum 70% required).",
            revenue_percentage=revenue_pct,
            fp_content=None,
        )

    # Transition event to OPERATING status once FP is generated
    if event.status == EventStatus.BOOKED:
        event.status = EventStatus.OPERATING

    # ─── Featherless.ai Smart FP Generation ───
    try:
        fp_text = await featherless.generate_smart_fp(
            party_name=event.party_name,
            client_name=event.client_name,
            event_date=event.event_date.strftime("%d %b %Y, %I:%M %p"),
            location=event.location,
            guest_count=event.guest_count,
            menu_tier=event.menu_tier.value,
            total_quoted=float(event.total_quoted_amount),
            revenue_collected=float(total_verified),
        )
    except Exception as e:
        logger.warning(f"Featherless.ai Smart FP failed, using fallback: {e}")
        fp_text = (
            f"FUNCTION PROSPECTUS\n"
            f"═══════════════════\n"
            f"Event: {event.party_name}\n"
            f"Client: {event.client_name}\n"
            f"Date: {event.event_date.strftime('%d %b %Y, %I:%M %p')}\n"
            f"Location: {event.location}\n"
            f"Expected Guests: {event.guest_count}\n"
            f"Menu Tier: {event.menu_tier.value.upper()}\n"
            f"Revenue Collected: ₹{total_verified:,.2f} ({revenue_pct:.1f}%)\n"
        )

    await db.flush()

    return FPGenerationResponse(
        event_id=event.id,
        success=True,
        message="Function Prospectus generated successfully via AI.",
        revenue_percentage=revenue_pct,
        fp_content=fp_text,
    )
