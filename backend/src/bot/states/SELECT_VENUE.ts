import { StateHandler, Session } from '../types';
import { getAvailableHalls, getHalls } from '../dataContext';
import { createListMessage, createTextMessage, createStateResponse } from '../messageBuilder';

const SELECT_VENUE: StateHandler = {
  handle: async (input: string, session: Session) => {
    const halls = getHalls();
    const selectedHall = halls.find((h) => h.id === input || h.name.toLowerCase().includes(input.toLowerCase()));

    if (selectedHall) {
      return {
        nextState: 'SELECT_MENU_TYPE',
        updatedData: {
          venue_id: selectedHall.id,
          venue_name: selectedHall.name,
        },
      };
    }

    return {
      nextState: 'SELECT_VENUE',
      error: 'Please select a venue from the list.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const eventDate = session.data.event_date;
    const timeSlot = session.data.event_time_slot;
    const guestCount = session.data.guest_count || 0;

    // First check availability before showing venues
    if (!session.data.availability_checked) {
      const availableHalls = await getAvailableHalls(eventDate, timeSlot, guestCount);
      
      // If no venues available or limited availability, go to availability check
      if (availableHalls.length === 0 || availableHalls.length < 2) {
        return createStateResponse('AVAILABILITY_CHECK', phone, createTextMessage(phone, 'Checking availability...'));
      }
      
      // Mark availability as checked and proceed
      session.data.availability_checked = true;
    }

    const availableHalls = await getAvailableHalls(eventDate, timeSlot, guestCount);

    if (availableHalls.length === 0) {
      const message = createTextMessage(
        phone,
        `⚠️ Unfortunately, no halls are available on ${eventDate} (${timeSlot}).\n\nWould you like to try a different date? Reply with a new date or type RESTART to start over.`
      );
      return createStateResponse('SELECT_VENUE', phone, message);
    }

    const rows = availableHalls.map((hall) => ({
      id: hall.id,
      title: hall.name,
      description: `Capacity: ${hall.capacity} — ${hall.description.substring(0, 50)}`,
    }));

    const message = createListMessage(
      phone,
      `🎯 **Available Halls for ${eventDate} (${timeSlot})**\n\nAll can accommodate your ${guestCount} guests.\n\n💡 *Tip:* Popular dates fill up fast! Consider booking early for better venue options.`,
      'Choose Venue',
      [
        {
          title: `📍 Available Venues (${availableHalls.length})`,
          rows,
        },
      ],
      '🏛️ Select Your Venue'
    );

    return createStateResponse('SELECT_VENUE', phone, message);
  },
};

export default SELECT_VENUE;
