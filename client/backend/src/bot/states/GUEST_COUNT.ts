import { StateHandler, Session } from '../types';
import { sendButtons } from '../whatsapp';

const GUEST_COUNT: StateHandler = {
  handle: async (input: string, session: Session) => {
    const validCounts = ['Under 100', '100-300', '300-500', '500+'];
    if (!validCounts.includes(input)) {
        return { nextState: 'GUEST_COUNT', error: 'Please select a valid guest count option.' };
    }
    return { nextState: 'GST', updatedData: { guestCount: input } };
  },
  prompt: async (phone: string, session: Session) => {
    await sendButtons(phone, 'How many guests are you expecting?', [
      { id: 'Under 100', title: 'Under 100' },
      { id: '100-300', title: '100-300' },
      { id: '300-500', title: '300-500' },
      { id: '500+', title: '500+' }
    ]);
  },
};

export default GUEST_COUNT;
