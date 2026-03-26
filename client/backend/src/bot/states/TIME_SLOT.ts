import { StateHandler, Session } from '../types';
import { sendButtons } from '../whatsapp';

const TIME_SLOT: StateHandler = {
  handle: async (input: string, session: Session) => {
    const validSlots = ['Morning', 'Afternoon', 'Evening'];
    if (!validSlots.includes(input)) {
        return { nextState: 'TIME_SLOT', error: 'Please select a valid time slot.' };
    }
    return { nextState: 'GUEST_COUNT', updatedData: { timeSlot: input } };
  },
  prompt: async (phone: string, session: Session) => {
    await sendButtons(phone, 'What time slot are you looking for?', [
      { id: 'Morning', title: 'Morning 8am-12pm' },
      { id: 'Afternoon', title: 'Afternoon 12pm-5pm' },
      { id: 'Evening', title: 'Evening 5pm-11pm' }
    ]);
  },
};

export default TIME_SLOT;
