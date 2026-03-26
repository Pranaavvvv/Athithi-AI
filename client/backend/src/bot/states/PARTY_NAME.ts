import { StateHandler, Session } from '../types';
import { sendText } from '../whatsapp';

const PARTY_NAME: StateHandler = {
  handle: async (input: string, session: Session) => {
    if (input.trim().length < 2) {
      return { nextState: 'PARTY_NAME', error: 'Party name must be at least 2 characters long.' };
    }
    return { nextState: 'EVENT_TYPE', updatedData: { partyName: input.trim() } };
  },
  prompt: async (phone: string, session: Session) => {
    await sendText(phone, 'Great! Let\'s start with the party name. What should we call this event? (e.g., Smith Wedding, ACME Corp Retreat)');
  },
};

export default PARTY_NAME;
