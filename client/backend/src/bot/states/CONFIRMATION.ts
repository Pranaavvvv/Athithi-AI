import { StateHandler, Session } from '../types';
import { sendButtons } from '../whatsapp';

const CONFIRMATION: StateHandler = {
  handle: async (input: string, session: Session) => {
    if (input === 'Confirm') {
      return { nextState: 'DONE', updatedData: {} };
    }
    if (input === 'Edit') {
      // Return back to PARTY_NAME but keep data around
      return { nextState: 'PARTY_NAME', updatedData: {} };
    }
    return { nextState: 'CONFIRMATION', error: 'Please choose Confirm or Edit.' };
  },
  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const summary = `*Booking Summary*\n\n` +
      `*Party Name:* ${data.partyName || 'N/A'}\n` +
      `*Event Type:* ${data.eventType || 'N/A'}\n` +
      `*Date:* ${data.date || 'N/A'}\n` +
      `*Time Slot:* ${data.timeSlot || 'N/A'}\n` +
      `*Guest Count:* ${data.guestCount || 'N/A'}\n` +
      `*GST:* ${data.gstNumber || 'N/A'}\n` +
      `*Package:* ${data.package || 'N/A'}\n\n` +
      `Does this look correct?`;

    await sendButtons(phone, summary, [
      { id: 'Confirm', title: 'Confirm' },
      { id: 'Edit', title: 'Edit' },
    ]);
  },
};

export default CONFIRMATION;
