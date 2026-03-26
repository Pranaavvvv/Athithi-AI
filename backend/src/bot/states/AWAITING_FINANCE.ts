import { StateHandler, Session } from '../types';
import { createTextMessage, createStateResponse } from '../messageBuilder';

const AWAITING_FINANCE: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();
    
    // Help command
    if (normalized === 'help') {
      return { 
        nextState: 'AWAITING_FINANCE', 
        updatedData: {}, 
        error: 'Your booking is pending Finance confirmation.\n\nAvailable commands:\n- *done* — Simulate payment confirmation (demo)\n- *RESTART* — Start a new booking\n- *HELP* — Show this message'
      };
    }

    // Mock payment confirmation for demo/hackathon
    if (normalized === 'done' || normalized === 'paid' || normalized === 'confirmed') {
      console.log(`[AWAITING_FINANCE] Mock payment confirmation for ${session.phone}`);
      return { nextState: 'DONE', updatedData: {}, error: undefined };
    }

    return { 
      nextState: 'AWAITING_FINANCE', 
      updatedData: {}, 
      error: 'Your booking is pending Finance confirmation. We\'ll notify you as soon as it\'s confirmed!\n\n_Type *done* to simulate payment confirmation (demo)._'
    };
  },

  prompt: async (phone: string, session: Session) => {
    const message = createTextMessage(
      phone,
      'Your booking is pending Finance confirmation. We\'ll notify you as soon as it\'s confirmed!\n\n_Type *done* after making payment to confirm (demo shortcut)._'
    );
    return createStateResponse('AWAITING_FINANCE', phone, message);
  },
};

export default AWAITING_FINANCE;
