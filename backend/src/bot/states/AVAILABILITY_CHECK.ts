import { StateHandler, Session } from '../types';
import { getAvailableHalls } from '../dataContext';
import { createButtonMessage, createTextMessage, createStateResponse } from '../messageBuilder';

const AVAILABILITY_CHECK: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();

    // Handle alternative date suggestions
    if (normalized.includes('alternative') || normalized.includes('other date') || normalized.includes('different date')) {
      return {
        nextState: 'COLLECT_BASICS',
        updatedData: {
          event_date: undefined,
          event_time_slot: undefined,
          availability_check_needed: true,
        },
      };
    }

    // Handle flexible date option
    if (normalized.includes('flexible') || normalized.includes('any date') || normalized.includes('adjustable')) {
      return {
        nextState: 'SELECT_VENUE',
        updatedData: {
          flexible_dates: true,
          availability_notes: 'Client is flexible with dates',
        },
      };
    }

    // Handle waitlist option
    if (normalized.includes('waitlist') || normalized.includes('waiting list') || normalized.includes('notify')) {
      return {
        nextState: 'SELECT_VENUE',
        updatedData: {
          waitlist_requested: true,
          availability_notes: 'Client wants to be on waitlist for preferred date',
        },
      };
    }

    // Handle proceed with available options
    if (normalized.includes('proceed') || normalized.includes('continue') || normalized.includes('show available')) {
      return {
        nextState: 'SELECT_VENUE',
        updatedData: {
          check_alternative_venues: true,
        },
      };
    }

    // Handle custom discussion request
    if (normalized.includes('discuss') || normalized.includes('call') || normalized.includes('talk') || normalized.includes('team')) {
      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          availability_discussion: true,
          availability_notes: 'Client wants to discuss availability with event team',
          menu_items: 'Availability discussion required - Menu to be discussed',
          menu_items_array: ['To be discussed'],
        },
      };
    }

    return {
      nextState: 'AVAILABILITY_CHECK',
      error: 'Please select an option: Alternative date, Flexible dates, Waitlist, Proceed with available venues, or Discuss with team.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const eventDate = data.event_date;
    const timeSlot = data.event_time_slot;
    const guestCount = data.guest_count || 0;

    // Check availability for the requested date
    const availableHalls = await getAvailableHalls(eventDate, timeSlot, guestCount);
    
    let messageText = '';
    
    if (availableHalls.length === 0) {
      messageText = `❌ **No venues available** on ${eventDate} (${timeSlot}) for ${guestCount} guests.\n\n`;
      messageText += `📅 **Requested:** ${eventDate} • ${timeSlot}\n`;
      messageText += `👥 **Guests:** ${guestCount}\n\n`;
      messageText += `💡 **Options:**\n`;
      messageText += `• Choose alternative dates\n`;
      messageText += `• Be flexible with timing\n`;
      messageText += `• Join waitlist\n`;
      messageText += `• Discuss with our event team\n\n`;
      messageText += `How would you like to proceed?`;
    } else {
      messageText = `✅ **Limited availability** on ${eventDate} (${timeSlot})\n\n`;
      messageText += `📍 **Available Venues (${availableHalls.length}):**\n`;
      availableHalls.forEach((hall, index) => {
        messageText += `${index + 1}. ${hall.name} (Capacity: ${hall.capacity})\n`;
      });
      messageText += `\n⚠️ **Note:** Popular dates fill up quickly! Consider:\n`;
      messageText += `• Alternative dates for better venue options\n`;
      messageText += `• Flexible timing\n`;
      messageText += `• Early booking confirmation\n\n`;
      messageText += `Would you like to proceed with available options or explore alternatives?`;
    }

    const buttons = availableHalls.length === 0 ? [
      { id: 'alternative_date', title: '📅 Alternative Date' },
      { id: 'flexible_dates', title: '🔄 Flexible Dates' },
      { id: 'waitlist', title: '⏰ Join Waitlist' },
      { id: 'discuss_team', title: '💬 Discuss with Team' },
    ] : [
      { id: 'proceed', title: '✅ Proceed with Available' },
      { id: 'alternative_date', title: '📅 Check Other Dates' },
      { id: 'flexible_dates', title: '🔄 Be Flexible' },
      { id: 'discuss_team', title: '💬 Discuss Options' },
    ];

    const message = createButtonMessage(phone, messageText, buttons);

    return createStateResponse('AVAILABILITY_CHECK', phone, message);
  },
};

export default AVAILABILITY_CHECK;
