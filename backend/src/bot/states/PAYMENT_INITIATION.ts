import { StateHandler, Session } from '../types';
import { updateEnquiry, updateSession } from '../db';
import { createTextMessage, createStateResponse } from '../messageBuilder';
import axios from 'axios';

const FINANCE_AGENT_URL = process.env.FINANCE_AGENT_URL || 'https://hackniche-financial-agent.onrender.com';

/**
 * Maps bot package names to Finance Agent menu tiers
 */
function mapPackageToTier(pkg: string): string {
  const tierMap: Record<string, string> = {
    standard: 'standard',
    premium: 'premium',
    elite: 'elite',
    personalized: 'elite', // fallback
  };
  return tierMap[pkg?.toLowerCase()] || 'standard';
}

const PAYMENT_INITIATION: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();
    if (normalized === 'done' || normalized === 'paid' || normalized === 'confirmed') {
      console.log(`[PAYMENT_INITIATION] Mock payment confirmation shortcut for ${session.phone}`);
      return { nextState: 'DONE', updatedData: {}, error: undefined };
    }
    // This state doesn't normally accept user input - it just displays payment info
    // User stays here until Finance Manager confirms payment (or types done for demo)
    return { nextState: 'AWAITING_FINANCE', updatedData: {}, error: undefined };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const paymentSchedule = data.payment_schedule || [];
    const firstInstallment = paymentSchedule[0];

    let scheduleText = '';
    paymentSchedule.forEach((item: any) => {
      const dueText = item.due === 'now' ? 'Now' : item.due === 'before_event' ? 'Before Event' : 'After Event';
      scheduleText += `• ${item.label}: ₹${item.amount.toLocaleString('en-IN')} — Due ${dueText}\n`;
    });

    const messageText =
      `🎊 *Almost there!*\n\n` +
      `Here's your payment schedule:\n\n` +
      `${scheduleText}\n` +
      `To confirm your slot, please make the advance payment of ₹${firstInstallment.amount.toLocaleString('en-IN')}.\n\n` +
      `💳 *Payment Details:*\n` +
      `UPI ID: ${process.env.UPI_ID || 'athithiai@bank'}\n` +
      `Payment Link: ${process.env.PAYMENT_LINK || 'Contact us for payment link'}\n\n` +
      `Once payment is received, our Finance team will confirm your booking. You'll receive a confirmation message within 2 hours during business hours.\n\n` +
      `_Type *done* after making payment (demo shortcut)._`;

    const message = createTextMessage(phone, messageText);

    // Update enquiry status to ENQUIRY (pending payment confirmation)
    try {
      await updateEnquiry(phone, {
        status: 'ENQUIRY',
        event_name: data.event_name,
        occasion_type: data.occasion_type,
        client_name: data.client_name,
        client_phone: data.client_phone,
        guest_count: data.guest_count,
        event_date: data.event_date,
        event_time_slot: data.event_time_slot,
        gst_number: data.gst_number,
        package: data.package,
        estimated_cost: data.estimated_cost,
        venue_id: data.venue_id,
        venue_name: data.venue_name,
        menu_type: data.menu_type,
        menu_items: data.menu_items,
        decoration_id: data.decoration_id,
        decoration_name: data.decoration_name,
        installment_plan: data.installment_plan,
        payment_schedule: data.payment_schedule,
      });
    } catch (err) {
      console.error('Error updating enquiry:', err);
    }

    // ─── BRIDGE: Create event in Finance Agent ───
    try {
      // Build event date as ISO datetime
      const eventDateStr = data.event_date || new Date().toISOString().split('T')[0];
      const timeSlotMap: Record<string, string> = {
        morning: '10:00:00',
        afternoon: '14:00:00',
        evening: '18:00:00',
        night: '20:00:00',
      };
      const timeStr = timeSlotMap[data.event_time_slot?.toLowerCase()] || '12:00:00';
      const eventDateISO = `${eventDateStr}T${timeStr}+05:30`;

      const agentPayload = {
        party_name: data.event_name || 'Event Booking',
        client_name: data.client_name || 'Customer',
        client_phone: data.client_phone || phone,
        event_date: eventDateISO,
        location: data.venue_name || 'Main Hall',
        guest_count: data.guest_count || 100,
        menu_tier: mapPackageToTier(data.package),
        gst_info: data.gst_number || null,
        addons_amount: 0,
        gst_percentage: 18,
      };

      console.log('[BRIDGE] Creating event in Finance Agent:', JSON.stringify(agentPayload));
      const eventRes = await axios.post(`${FINANCE_AGENT_URL}/api/finance/events`, agentPayload);
      const eventId = eventRes.data.id;
      console.log('[BRIDGE] Event created successfully, ID:', eventId);

      // Initialize the 30/40/30 installment plan
      console.log('[BRIDGE] Initializing installment plan for event:', eventId);
      const planRes = await axios.post(`${FINANCE_AGENT_URL}/api/finance/init-plan`, { event_id: eventId });
      console.log('[BRIDGE] Installment plan created:', planRes.data.length, 'milestones');

      // Store event_id and deposit ledger_id in session data for later reference
      data.finance_event_id = eventId;
      if (planRes.data && planRes.data.length > 0) {
        // Find the deposit milestone ledger entry
        const depositEntry = planRes.data.find((m: any) => m.milestone === 'deposit');
        if (depositEntry) {
          data.finance_deposit_ledger_id = depositEntry.id;
        }
      }

      // Persist the finance IDs to session so DONE state can access them
      await updateSession(phone, 'PAYMENT_INITIATION', data);
      console.log('[BRIDGE] Saved finance_event_id to session:', eventId);

    } catch (err: any) {
      console.error('[BRIDGE] Error creating event in Finance Agent:', err.response?.data || err.message);
      // Don't block the flow — just log the error
    }

    return createStateResponse('PAYMENT_INITIATION', phone, message);
  },
};

export default PAYMENT_INITIATION;
