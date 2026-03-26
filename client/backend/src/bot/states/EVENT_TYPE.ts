import { StateHandler, Session } from '../types';
import { sendButtons, sendText } from '../whatsapp';

const EVENT_TYPE: StateHandler = {
  handle: async (input: string, session: Session) => {
    if (session.data?.awaitingOtherEvent) {
      if (input.trim().length < 2) {
        return { nextState: 'EVENT_TYPE', error: 'Please enter a valid event type.' };
      }
      return { 
        nextState: 'DATE', 
        updatedData: { eventType: input.trim(), awaitingOtherEvent: false } 
      };
    }

    const validTypes = ['Wedding', 'Birthday/Anniv', 'Corporate', 'Other'];
    if (!validTypes.includes(input)) {
        return { nextState: 'EVENT_TYPE', error: 'Please select a valid option.' };
    }

    if (input === 'Other') {
        return { nextState: 'EVENT_TYPE', updatedData: { awaitingOtherEvent: true } };
    }

    return { nextState: 'DATE', updatedData: { eventType: input } };
  },
  prompt: async (phone: string, session: Session) => {
    if (session.data?.awaitingOtherEvent) {
        await sendText(phone, 'Please tell us what kind of event you are planning.');
    } else {
        await sendButtons(phone, 'What type of event is this?', [
            { id: 'Wedding', title: 'Wedding' },
            { id: 'Birthday/Anniv', title: 'Birthday/Anniv' },
            { id: 'Corporate', title: 'Corporate' },
            { id: 'Other', title: 'Other' }
        ]);
    }
  },
};

export default EVENT_TYPE;
