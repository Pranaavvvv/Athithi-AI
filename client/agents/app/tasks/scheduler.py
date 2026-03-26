"""
Background Scheduler — Automated payment reminder dispatches.
Uses APScheduler to run daily checks on upcoming due dates.
"""

import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import async_session
from app.models.event import Event
from app.models.financial_ledger import FinancialLedger
from app.models.enums import PaymentStatus
from app.services import whatsapp

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def check_upcoming_payments():
    """
    Daily job: Check all ledger entries with due dates within 3 days
    that haven't been verified. Auto-dispatch WhatsApp reminders.
    """
    logger.info("Running scheduled payment reminder check...")

    async with async_session() as session:
        today = date.today()
        cutoff = today + timedelta(days=3)

        # Find unpaid milestones due within 3 days
        result = await session.execute(
            select(FinancialLedger)
            .where(
                FinancialLedger.payment_status != PaymentStatus.VERIFIED,
                FinancialLedger.due_date <= cutoff,
                FinancialLedger.due_date >= today,
            )
        )
        pending_entries = result.scalars().all()

        for entry in pending_entries:
            # Fetch the event for client contact info
            event_result = await session.execute(
                select(Event).where(Event.id == entry.event_id)
            )
            event = event_result.scalar_one_or_none()
            if not event:
                continue

            # Send WhatsApp reminder
            response = await whatsapp.send_payment_reminder(
                to_phone=event.client_phone,
                party_name=event.party_name,
                milestone=entry.milestone.value,
                amount_due=float(entry.amount_due),
                due_date=str(entry.due_date),
            )

            if response.get("sent"):
                logger.info(f"Reminder sent for Event '{event.party_name}' — {entry.milestone.value}")
            else:
                logger.warning(
                    f"Failed to send reminder for Event '{event.party_name}': {response.get('error')}"
                )

    logger.info("Payment reminder check complete.")


def start_scheduler():
    """Start the background scheduler with the daily payment check job."""
    scheduler.add_job(
        check_upcoming_payments,
        "cron",
        hour=9,
        minute=0,
        id="daily_payment_reminder",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Background scheduler started. Payment reminders run daily at 9:00 AM.")


def stop_scheduler():
    """Gracefully stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped.")
