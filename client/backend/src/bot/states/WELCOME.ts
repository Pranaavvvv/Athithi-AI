import { StateHandler, Session } from '../types';
import { sendButtons, sendText } from '../whatsapp';

const WELCOME: StateHandler = {
  handle: async (input: string, session: Session) => {
    if (input === 'Book an Event') {
      return { nextState: 'PARTY_NAME', updatedData: {} };
    }
    if (input === 'My Booking') {
      await sendText(session.phone, 'Dashboard coming soon!');
      return { nextState: 'WELCOME' };
    }
    if (input === 'Talk to Someone') {
      await sendText(session.phone, 'Our team will contact you shortly.');
      return { nextState: 'WELCOME' };
    }
    return { nextState: 'WELCOME', error: 'Please select a valid option.' };
  },
  prompt: async (phone: string, session: Session) => {
    await sendButtons(phone, 'Welcome to IntelliManager! How can we help you today?', [
      { id: 'Book an Event', title: 'Book an Event' },
      { id: 'My Booking', title: 'My Booking' },
      { id: 'Talk to Someone', title: 'Talk to Someone' },
    ]);
  },
};

export default WELCOME;
