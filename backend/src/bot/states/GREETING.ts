import { StateHandler, Session } from '../types';
import { createButtonMessage, createTextMessage, createStateResponse, createMultiMessageResponse } from '../messageBuilder';

const GREETING: StateHandler = {
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

    // Handle button replies
    if (input === 'book_event' || input === 'Book an Event') {
      return { nextState: 'COLLECT_BASICS', updatedData: {} };
    }

    
    if (input === 'my_booking' || input === 'My Booking') {
      const message = createTextMessage(session.phone, '📋 We\'ll share your booking dashboard link shortly. Our team will be in touch!');
      return { nextState: 'GREETING', updatedData: {}, error: undefined };
    }
    
    if (input === 'talk_to_someone' || input === 'Talk to Someone') {
      const message = createTextMessage(session.phone, '📞 A team member will contact you shortly. Hang tight!');
      return { nextState: 'GREETING', updatedData: {}, error: undefined };
    }

    // Natural language understanding
    const bookingIntent = /\b(book|plan|event|party|wedding|birthday|corporate|banquet|reserve|arrange|organize|celebrate)\b/i;
    const greetingIntent = /\b(hi|hello|hey|hola|namaste|good\s*(morning|afternoon|evening)|sup|yo)\b/i;

    if (bookingIntent.test(input)) {
      return { nextState: 'COLLECT_BASICS', updatedData: {} };
    }

    if (greetingIntent.test(input)) {
      return { nextState: 'GREETING', updatedData: {} };
    }

    // Unknown input
    return { 
      nextState: 'GREETING', 
      error: "Oops! I didn't quite catch that. Could you please tap on one of the options below to proceed? ⬇️✨" 
    };
  },

  prompt: async (phone: string, session: Session) => {
    const introMessage = createTextMessage(
      phone,
      '✨ *Welcome to AthithiAI!* ✨\n\nI am your intelligent personal banquet concierge. 🤖🏨\n\nI specialize in making event planning effortlessly simple. Whether you’re organizing a grand wedding, a corporate gala, or an intimate birthday party, I’m here to help manage everything from choosing the perfect venue and custom menus to stunning decorations. 🌟\n\nI am a completely automated AI assistant designed to give you instant availability checks, accurate cost estimates, and a seamless booking experience.'
    );

    const menuMessage = createButtonMessage(
      phone,
      'What would you like to explore today? 👇',
      [
        { id: 'book_event', title: '🎉 Book an Event' },
        { id: 'my_booking', title: '📋 My Booking' },
        { id: 'talk_to_someone', title: '📞 Talk to Someone' },
      ]
    );

    return createMultiMessageResponse('GREETING', phone, [introMessage, menuMessage]);
  },
};

export default GREETING;
