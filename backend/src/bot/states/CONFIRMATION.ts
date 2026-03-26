import { StateHandler, Session } from '../types';
import { sendButtons, sendText } from '../whatsapp';

const CONFIRMATION: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.trim().toLowerCase();

    // Accept natural language confirms
    const confirmPatterns = /^(confirm|yes|yep|yeah|looks good|perfect|go ahead|ok|okay|done|let'?s go|book it|all good|correct|right|approved|lgtm)/i;
    const editPatterns = /^(edit|change|modify|update|no|nope|wrong|fix|redo|start over|restart|not right)/i;

    if (input === 'Confirm' || confirmPatterns.test(normalized)) {
      return { nextState: 'INSTALLMENT', updatedData: {} };
    }
    if (input === 'Edit' || editPatterns.test(normalized)) {
      await sendText(session.phone, "No worries! Let's go back and fix things. I'll start the conversation again 🔄");
      return { nextState: 'AI_PIPELINE', updatedData: { aiChatHistory: null, lastAiReply: null, aiExtracted: null } };
    }

    return { nextState: 'CONFIRMATION', error: "Just say *Confirm* to proceed or *Edit* to make changes! 😊" };
  },
  prompt: async (phone: string, session: Session) => {
    const d = session.data;

    // Calculate estimated cost
    let perGuest = 770; // default standard
    if (d.package?.toLowerCase() === 'premium') perGuest = 1140;
    if (d.package?.toLowerCase() === 'elite') perGuest = 2600;
    const guestNum = parseInt(d.guestCount) || 0;
    const estimatedCost = guestNum * perGuest;

    const summary =
      `📋 *Your Booking Summary*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🎉 *Event:* ${d.partyName || 'N/A'}\n` +
      `👤 *Client:* ${d.clientName || 'N/A'}\n` +
      `🎭 *Type:* ${d.eventType || 'N/A'}\n` +
      `📍 *Location:* ${d.location || 'N/A'}\n` +
      `📅 *Date:* ${d.date || 'N/A'}\n` +
      `🕐 *Time:* ${d.timeSlot || 'N/A'}\n` +
      `👥 *Guests:* ${d.guestCount || 'N/A'}\n` +
      `🧾 *GST:* ${d.gstNumber || 'N/A'}\n` +
      `⭐ *Package:* ${d.package || 'N/A'}\n` +
      `🍽️ *Menu:* ${d.menu || 'N/A'}\n` +
      `💐 *Decoration:* ${d.decoration || 'N/A'}\n\n` +
      (estimatedCost > 0 ? `💰 *Estimated Cost:* ₹${estimatedCost.toLocaleString('en-IN')}\n\n` : '') +
      `Does everything look correct? ✅`;

    await sendButtons(phone, summary, [
      { id: 'Confirm', title: '✅ Confirm' },
      { id: 'Edit', title: '✏️ Edit' },
    ]);
  },
};

export default CONFIRMATION;
