import { StateHandler, Session } from '../types';
import { sendText, sendButtons } from '../whatsapp';
import { checkDateConflict, getAlternativeDates } from '../db';

const DATE: StateHandler = {
  handle: async (input: string, session: Session) => {
    if (session.data?.conflictDates) {
      if (session.data.conflictDates.includes(input)) {
        return { nextState: 'TIME_SLOT', updatedData: { date: input, conflictDates: null } };
      }
    }

    const dateRegex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!dateRegex.test(input)) {
      if (session.data?.conflictDates) {
        return { nextState: 'DATE', error: 'Please select one of the provided available dates.' };
      }
      return { nextState: 'DATE', error: 'Please enter a valid date in DD/MM/YYYY format.' };
    }

    const hasConflict = await checkDateConflict(input);
    if (hasConflict) {
      const alternatives = await getAlternativeDates(input);
      return { nextState: 'DATE', updatedData: { conflictDates: alternatives } };
    }

    return { nextState: 'TIME_SLOT', updatedData: { date: input } };
  },
  prompt: async (phone: string, session: Session) => {
    if (session.data?.conflictDates && session.data.conflictDates.length > 0) {
      const dates = session.data.conflictDates;
      await sendButtons(phone, 'Sorry, that date is already booked. Here are the nearest available dates. Please choose one:', [
        { id: dates[0], title: dates[0] },
        { id: dates[1], title: dates[1] },
      ]);
    } else {
      await sendText(phone, 'Please enter the event date in DD/MM/YYYY format:');
    }
  },
};

export default DATE;
