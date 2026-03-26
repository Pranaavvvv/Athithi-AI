import { StateHandler, Session } from '../types';
import { sendText, sendButtons } from '../whatsapp';

const GST: StateHandler = {
  handle: async (input: string, session: Session) => {
    if (session.data?.awaitingGstNumber) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(input.trim().toUpperCase())) {
        return { nextState: 'GST', error: 'Invalid GST Number format. Please try again.' };
      }
      return { 
        nextState: 'PACKAGE_SELECTION', 
        updatedData: { gstNumber: input.trim().toUpperCase(), awaitingGstNumber: null } 
      };
    }

    if (input === 'Yes') {
      return { nextState: 'GST', updatedData: { awaitingGstNumber: true } };
    }
    if (input === 'No') {
      return { nextState: 'PACKAGE_SELECTION', updatedData: { gstNumber: 'N/A' } };
    }

    return { nextState: 'GST', error: 'Please choose Yes or No.' };
  },
  prompt: async (phone: string, session: Session) => {
    if (session.data?.awaitingGstNumber) {
      await sendText(phone, 'Please enter your 15-character GST Number:');
    } else {
      await sendButtons(phone, 'Do you want to provide a GST number for billing?', [
        { id: 'Yes', title: 'Yes' },
        { id: 'No', title: 'No' },
      ]);
    }
  },
};

export default GST;
