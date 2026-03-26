import { StateHandler, Session } from '../types';
import { createButtonMessage, createTextMessage, createStateResponse } from '../messageBuilder';
import { updateEnquiry } from '../db';

const SUMMARY_CONFIRM: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();

    if (input === 'confirm_booking' || normalized.includes('confirm') || normalized.includes('yes') || normalized.includes('correct')) {
      // Update the existing ENQUIRED record with full booking details
      try {
        await updateEnquiry(session.phone, {
          event_name: session.data.event_name,
          occasion_type: session.data.occasion_type,
          client_name: session.data.client_name,
          client_phone: session.data.client_phone,
          guest_count: session.data.guest_count,
          event_date: session.data.event_date,
          event_time_slot: session.data.event_time_slot,
          gst_number: session.data.gst_number,
          package: session.data.package,
          estimated_cost: session.data.estimated_cost,
          venue_id: session.data.venue_id,
          venue_name: session.data.venue_name,
          menu_type: session.data.menu_type,
          menu_items: session.data.menu_items,
          decoration_id: session.data.decoration_id,
          decoration_name: session.data.decoration_name,
          status: 'ENQUIRY'
        });
        console.log('Enquiry updated successfully for:', session.data.client_name);
      } catch (error) {
        console.error('Error updating enquiry:', error);
      }
      
      return { nextState: 'INSTALLMENT', updatedData: {} };
    }

    if (input === 'edit_booking' || normalized.includes('edit') || normalized.includes('change') || normalized.includes('no')) {
      const message = createTextMessage(
        session.phone,
        'No problem! What would you like to change?\n\nType RESTART to start from the beginning, or tell me what needs updating.'
      );
      return { nextState: 'SUMMARY_CONFIRM', updatedData: {}, error: undefined };
    }

    return {
      nextState: 'SUMMARY_CONFIRM',
      error: 'Please confirm your booking or request edits.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const d = session.data;

    const summary =
      `📋 *Booking Summary*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🎉 *Event:* ${d.event_name || 'N/A'}\n` +
      `👤 *Client:* ${d.client_name || 'N/A'}\n` +
      `🎭 *Occasion:* ${d.occasion_type || 'N/A'}\n` +
      `📍 *Venue:* ${d.venue_name || 'N/A'}\n` +
      `📅 *Date:* ${d.event_date || 'N/A'}\n` +
      `🕐 *Time:* ${d.event_time_slot || 'N/A'}\n` +
      `👥 *Guests:* ${d.guest_count || 'N/A'}\n` +
      `⭐ *Package:* ${d.package || 'N/A'}\n` +
      `🍽️ *Menu type:* ${d.menu_type || 'N/A'}\n` +
      `🍴 *Selected items:* ${d.menu_items || 'N/A'}\n` +
      `💐 *Decoration:* ${d.decoration_name || 'N/A'}\n` +
      `🧾 *GST:* ${d.gst_number || 'Not provided'}\n\n` +
      `💰 *Estimated Total: ₹${(d.estimated_cost || 0).toLocaleString('en-IN')}*\n` +
      `_(Final amount confirmed after Finance review)_\n\n` +
      `Does everything look correct?`;

    const summaryMessage = createTextMessage(phone, summary);
    
    // For the button message, we need to return it separately since the spec requires separate messages
    const buttonMessage = createButtonMessage(phone, 'Confirm your booking details above.', [
      { id: 'confirm_booking', title: '✅ Confirm' },
      { id: 'edit_booking', title: '✏️ Edit Details' },
    ]);

    // Return the summary message first, the state machine will handle the button message
    return createStateResponse('SUMMARY_CONFIRM', phone, summaryMessage, {
      pending_button_message: buttonMessage
    });
  },
};

export default SUMMARY_CONFIRM;
