import { StateHandler, Session } from '../types';
import { updateEnquiry, clearSession } from '../db';
import { createTextMessage, createStateResponse } from '../messageBuilder';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const RSVP_WEB_URL = process.env.RSVP_WEB_URL || 'https://athithiai.vercel.app/public/rsvp';

const DONE: StateHandler = {
  handle: async (input: string, session: Session) => {
    return { nextState: 'GREETING', updatedData: {} };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const bookingId = `BK${Date.now().toString().slice(-8)}`;

    let eventToken = 'PENDING';
    
    // Fetch the auto-generated event_token from the database using finance_event_id
    if (data.finance_event_id) {
      try {
        const evntRes = await pool.query('SELECT event_token FROM events WHERE id = $1', [data.finance_event_id]);
        if (evntRes.rows.length > 0) {
          eventToken = evntRes.rows[0].event_token;
        }
      } catch (e) {
        console.error('[DONE] Could not fetch event_token:', e);
      }
    }

    const masterRsvpLink = `${RSVP_WEB_URL}/${eventToken}`;

    const messageText =
      `🎊 *Your booking is CONFIRMED!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔗 Booking ID: ${bookingId}\n` +
      `🎉 ${data.event_name || 'Your Event'}\n` +
      `📅 ${data.event_date || 'TBD'} · ${data.event_time_slot || 'TBD'}\n` +
      `📍 ${data.venue_name || 'TBD'}\n` +
      `👥 ${data.guest_count || 0} guests\n` +
      `⭐ ${data.package || 'Standard'} package\n\n` +
      `📋 Your Function Prospectus has been sent to the event team.\n` +
      `📄 Your Purchase Order copy will be sent shortly.\n\n` +
      `💌 *Master RSVP Link:*\n` +
      `${masterRsvpLink}\n` +
      `_Share this unique link with your guests so they can RSVP, update their dietary preferences, and generate their face-scan QR codes!_\n\n` +
      `Our GRE team will contact you 48 hours before the event with check-in details.\n\n` +
      `Thank you for choosing us! 🙏`;

    const message = createTextMessage(phone, messageText);

    // 1. Update enquiries table
    try {
      await updateEnquiry(phone, { status: 'BOOKED', booking_id: bookingId });
    } catch (err) {
      console.error('[DONE] Error updating enquiry:', err);
    }

    // 2. Update events table directly (same DB, no API ceremony needed)
    try {
      const clientPhone = data.client_phone || phone;
      
      // Also update the ledger so the dashboard shows the demo payment was collected
      if (data.finance_deposit_ledger_id) {
        await pool.query(
          `UPDATE financial_ledgers SET payment_status = 'VERIFIED', utr_number = 'DEMO-' || floor(random() * 1000000)::text, updated_at = NOW(), amount_paid = amount_due
           WHERE id = $1`,
          [data.finance_deposit_ledger_id]
        );
      }
      
      const result = await pool.query(
        `UPDATE events SET status = 'BOOKED', is_active = true, updated_at = NOW()
         WHERE client_phone = $1 AND status = 'ENQUIRY'`,
        [clientPhone]
      );
      console.log(`[DONE] Updated ${result.rowCount} event(s) to BOOKED for phone: ${clientPhone}`);
    } catch (err: any) {
      console.error('[DONE] Error updating events/ledger table:', err.message);
    }

    // Clear session
    setTimeout(async () => {
      await clearSession(phone);
    }, 5000);

    return createStateResponse('DONE', phone, message);
  },
};

export default DONE;
