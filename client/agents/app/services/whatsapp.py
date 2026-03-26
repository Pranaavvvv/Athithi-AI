"""
WhatsApp Service — Twilio wrapper for sending messages.
Handles: Quotes, Purchase Orders, Payment Reminders, and Function Prospectus delivery.
"""

import os
from typing import Optional

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def _format_whatsapp_number(phone: str) -> str:
    """Ensure phone number is in whatsapp: format."""
    phone = phone.strip()
    if not phone.startswith("whatsapp:"):
        if not phone.startswith("+"):
            phone = f"+91{phone}"  # Default to India
        phone = f"whatsapp:{phone}"
    return phone


async def send_whatsapp_message(to_phone: str, message: str) -> dict:
    """
    Send a WhatsApp message via Twilio API.
    Returns status dict.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return {
            "sent": False,
            "error": "Twilio credentials not configured.",
            "message_preview": message[:100],
        }

    try:
        import httpx

        to = _format_whatsapp_number(to_phone)
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                data={
                    "From": TWILIO_WHATSAPP_FROM,
                    "To": to,
                    "Body": message,
                },
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            )
            response.raise_for_status()
            data = response.json()
            return {"sent": True, "sid": data.get("sid"), "status": data.get("status")}

    except Exception as e:
        return {"sent": False, "error": str(e)}


# ─── Pre-built Message Templates ───

async def send_quote(to_phone: str, party_name: str, total: float, menu_tier: str) -> dict:
    """Send an event quote to the client."""
    message = (
        f"🏨 *Banquet Quote - {party_name}*\n\n"
        f"Menu Tier: {menu_tier.upper()}\n"
        f"Total Estimated: ₹{total:,.2f} (incl. GST)\n\n"
        f"To proceed, please confirm your booking deposit (30%).\n"
        f"We look forward to hosting your event! 🎉"
    )
    return await send_whatsapp_message(to_phone, message)


async def send_purchase_order(
    to_phone: str, party_name: str, total: float, deposit_paid: float, event_date: str
) -> dict:
    """Send the official Purchase Order after confirmation."""
    message = (
        f"✅ *Purchase Order Confirmed - {party_name}*\n\n"
        f"Event Date: {event_date}\n"
        f"Total Amount: ₹{total:,.2f}\n"
        f"Deposit Paid: ₹{deposit_paid:,.2f}\n\n"
        f"Your booking is now *CONFIRMED*.\n"
        f"Remaining balance will be due as per the installment schedule.\n\n"
        f"Thank you for choosing us! 🏨"
    )
    return await send_whatsapp_message(to_phone, message)


async def send_payment_reminder(
    to_phone: str, party_name: str, milestone: str, amount_due: float, due_date: str
) -> dict:
    """Send a payment reminder for an upcoming milestone."""
    message = (
        f"💳 *Payment Reminder - {party_name}*\n\n"
        f"Milestone: {milestone.replace('_', ' ').title()}\n"
        f"Amount Due: ₹{amount_due:,.2f}\n"
        f"Due Date: {due_date}\n\n"
        f"Please make the payment at your earliest convenience.\n"
        f"Share the UTR/Transaction ID with us for verification."
    )
    return await send_whatsapp_message(to_phone, message)


async def send_function_prospectus(to_phone: str, party_name: str, fp_summary: str) -> dict:
    """Send Function Prospectus summary to internal team."""
    message = (
        f"📋 *Function Prospectus - {party_name}*\n\n"
        f"{fp_summary}\n\n"
        f"Please review and coordinate accordingly."
    )
    return await send_whatsapp_message(to_phone, message)
