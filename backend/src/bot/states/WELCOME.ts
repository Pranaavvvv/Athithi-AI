import { StateHandler, Session } from '../types';
import { createButtonMessage, createStateResponse, createTextMessage } from '../messageBuilder';

const WELCOME: StateHandler = {
  handle: async (input: string, session: Session) => {
    // Secret shortcut for testing
    if (input.toLowerCase() === 'test') {
      const mockData = {
        event_name: 'Auto-Test Gala',
        occasion_type: 'Corporate Event',
        client_name: 'Tester Boss',
        client_phone: '9999999999',
        guest_count: 100,
        event_date: '2026-12-31',
        event_time_slot: 'Evening',
        gst_number: '27AAAAA0000A1Z5',
        package: 'Premium',
        estimated_cost: 100000,
        venue_id: 'v_gc',
        venue_name: 'Grand Crystal Ballroom',
        menu_type: 'Mixed',
        menu_items: ['Truffle Soup', 'Steak'],
        decoration_id: 'd_glam',
        decoration_name: 'Glamorous Night',
        installment_plan: '30-40-30',
        payment_schedule: [
          { label: 'Booking Deposit (30%)', amount: 30000, due: 'now' },
          { label: 'Secondary Installment (40%)', amount: 40000, due: 'before_event' },
          { label: 'Final Settlement (30%)', amount: 30000, due: 'after_event' },
        ],
      };
      return { nextState: 'PAYMENT_INITIATION', updatedData: mockData };
    }

    // Exact button matches
    if (input === 'Book an Event') {
      return { nextState: 'AI_PIPELINE', updatedData: {} };
    }
    if (input === 'My Booking') {
      return { nextState: 'WELCOME', error: '📋 Your booking dashboard is being set up! Our team will share the link shortly.' };
    }
    if (input === 'Talk to Someone') {
      return { nextState: 'WELCOME', error: '📞 Our team will contact you shortly. Hang tight!' };
    }

    // NLU fallback — understand natural language intent to book
    const bookingIntent = /\b(book|plan|event|party|wedding|birthday|corporate|banquet|reserve|arrange|organize|celebrate)\b/i;
    const greetingIntent = /\b(hi|hello|hey|hola|namaste|good\s*(morning|afternoon|evening)|sup|yo)\b/i;

    if (bookingIntent.test(input)) {
      return { nextState: 'AI_PIPELINE', updatedData: {} };
    }

    if (greetingIntent.test(input)) {
      // Greetings get the welcome menu
      return { nextState: 'WELCOME' };
    }

    // Unknown input — gently re-prompt
    return { nextState: 'WELCOME', error: "I didn't quite catch that! Please pick an option below, or just say something like \"I want to book an event\" 🎉" };
  },
  prompt: async (phone: string, session: Session) => {
    const message = createButtonMessage(phone, '✨ Welcome to *AthithiAI*! Your AI-powered banquet concierge.\n\nHow can we help you today?', [
      { id: 'Book an Event', title: '🎉 Book an Event' },
      { id: 'My Booking', title: '📋 My Booking' },
      { id: 'Talk to Someone', title: '📞 Talk to Someone' },
    ]);
    return createStateResponse('WELCOME', phone, message);
  },
};

export default WELCOME;
