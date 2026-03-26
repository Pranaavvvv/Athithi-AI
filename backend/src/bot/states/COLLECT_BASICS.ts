import { StateHandler, Session } from '../types';
import { createTextMessage, createStateResponse } from '../messageBuilder';

const COLLECT_BASICS: StateHandler = {
  handle: async (input: string, session: Session) => {
    const data = session.data;
    const normalized = input.trim();

    // Step 1: Collect event_name and occasion_type
    if (!data.event_name || !data.occasion_type) {
      // Try to extract both from input
      const occasionMatch = normalized.match(/\b(wedding|birthday|anniversary|corporate)\b/i);
      
      if (occasionMatch) {
        const occasion = occasionMatch[1].toLowerCase();
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: {
            event_name: normalized,
            occasion_type: occasion.charAt(0).toUpperCase() + occasion.slice(1),
          },
        };
      }
      
      // If no occasion detected, store as event name and ask for occasion
      if (!data.event_name) {
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { event_name: normalized },
        };
      }
    }

    // Step 2: Collect client_name
    if (!data.client_name) {
      return {
        nextState: 'COLLECT_BASICS',
        updatedData: { client_name: normalized },
      };
    }

    // Step 3: Collect client_phone (can be same as WhatsApp)
    if (!data.client_phone) {
      const phoneMatch = normalized.match(/\d{10,}/);
      if (phoneMatch || normalized.toLowerCase().includes('same') || normalized.toLowerCase().includes('this')) {
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { client_phone: phoneMatch ? phoneMatch[0] : session.phone },
        };
      }
      return {
        nextState: 'COLLECT_BASICS',
        error: 'Please provide a valid 10-digit phone number, or say "same" to use your WhatsApp number.',
      };
    }

    // Step 4: Collect guest_count
    if (!data.guest_count) {
      const countMatch = normalized.match(/\d+/);
      if (countMatch) {
        const count = parseInt(countMatch[0]);
        if (count < 10) {
          return {
            nextState: 'COLLECT_BASICS',
            error: 'We require a minimum of 10 guests for bookings. Please provide a valid guest count.',
          };
        }
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { guest_count: count },
        };
      }
      return {
        nextState: 'COLLECT_BASICS',
        error: 'Please provide the number of guests (e.g., "200" or "around 150").',
      };
    }

    // Step 5: Collect event_date
    if (!data.event_date) {
      // Parse various date formats
      let parsedDate: Date | null = null;
      
      // Try YYYY-MM-DD
      const isoMatch = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        parsedDate = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      }
      
      // Try DD/MM/YYYY or DD-MM-YYYY
      const ddmmMatch = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (ddmmMatch) {
        parsedDate = new Date(parseInt(ddmmMatch[3]), parseInt(ddmmMatch[2]) - 1, parseInt(ddmmMatch[1]));
      }
      
      // Try relative dates like "next friday"
      if (normalized.toLowerCase().includes('next') || normalized.toLowerCase().includes('this')) {
        // Simple heuristic: add 7-14 days
        parsedDate = new Date();
        parsedDate.setDate(parsedDate.getDate() + 10);
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Validate: must be at least 7 days from today
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 7);
        
        if (parsedDate < minDate) {
          return {
            nextState: 'COLLECT_BASICS',
            error: '⚠️ Events must be booked at least 7 days in advance. Please choose a later date.',
          };
        }
        
        const formatted = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { event_date: formatted },
        };
      }
      
      return {
        nextState: 'COLLECT_BASICS',
        error: 'Please provide a valid date (e.g., "2026-04-15" or "15/04/2026").',
      };
    }

    // Step 6: Collect event_time_slot
    if (!data.event_time_slot) {
      const lower = normalized.toLowerCase();
      if (lower.includes('morning') || lower.includes('8') || lower.includes('9') || lower.includes('10') || lower.includes('11')) {
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { event_time_slot: 'morning' },
        };
      }
      if (lower.includes('afternoon') || lower.includes('12') || lower.includes('1') || lower.includes('2') || lower.includes('3') || lower.includes('4')) {
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { event_time_slot: 'afternoon' },
        };
      }
      if (lower.includes('evening') || lower.includes('5') || lower.includes('6') || lower.includes('7') || lower.includes('8') || lower.includes('9') || lower.includes('10') || lower.includes('night')) {
        return {
          nextState: 'COLLECT_BASICS',
          updatedData: { event_time_slot: 'evening' },
        };
      }
      return {
        nextState: 'COLLECT_BASICS',
        error: 'Please specify: Morning (8am-12pm), Afternoon (12pm-5pm), or Evening (5pm-11pm)?',
      };
    }

    // Step 7: Collect gst_number (optional)
    if (data.gst_number === undefined) {
      const lower = normalized.toLowerCase();
      if (lower.includes('no') || lower.includes('don\'t') || lower.includes('na') || lower.includes('not applicable')) {
        return {
          nextState: 'SELECT_PACKAGE',
          updatedData: { gst_number: null },
        };
      }
      
      // Basic GST validation (15 characters alphanumeric)
      const gstMatch = normalized.match(/[A-Z0-9]{15}/i);
      if (gstMatch) {
        return {
          nextState: 'SELECT_PACKAGE',
          updatedData: { gst_number: gstMatch[0].toUpperCase() },
        };
      }
      
      return {
        nextState: 'COLLECT_BASICS',
        error: 'Please provide your 15-character GST number, or say "no" if you don\'t have one.',
      };
    }

    // All collected, move to next state
    return { nextState: 'SELECT_PACKAGE', updatedData: {} };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    let messageText = '';

    if (!data.event_name) {
      messageText = '🎉 Great! Let\'s start planning your event.\n\nWhat\'s the occasion and what should we call this event?\n\n(e.g., "Sharma Family Wedding" or "ACME Annual Gala")';
    } else if (!data.occasion_type) {
      messageText = `Perfect! "${data.event_name}"\n\nWhat type of event is this?\n\n• Wedding\n• Birthday\n• Anniversary\n• Corporate\n• Other`;
    } else if (!data.client_name) {
      messageText = '👤 May I have your full name for the booking?';
    } else if (!data.client_phone) {
      messageText = '📞 What\'s the best contact number for you?\n\n(You can say "same" to use your WhatsApp number)';
    } else if (!data.guest_count) {
      messageText = '👥 How many guests are you expecting?\n\n(e.g., "200" or "around 150")';
    } else if (!data.event_date) {
      messageText = '📅 When would you like to host the event?\n\n(Please provide a date at least 7 days from today, e.g., "2026-04-15" or "15/04/2026")';
    } else if (!data.event_time_slot) {
      messageText = '🕐 What time slot works best?\n\n• Morning (8am-12pm)\n• Afternoon (12pm-5pm)\n• Evening (5pm-11pm)';
    } else if (data.gst_number === undefined) {
      messageText = '🧾 Do you have a GST number for billing?\n\n(Provide the 15-character GST number, or say "no")';
    }

    const message = createTextMessage(phone, messageText);
    return createStateResponse('COLLECT_BASICS', phone, message);
  },
};

export default COLLECT_BASICS;
