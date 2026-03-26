import { StateHandler, Session } from '../types';
import { createListMessage, createStateResponse } from '../messageBuilder';

const SELECT_PACKAGE: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();

    // Handle list reply IDs
    if (input === 'pkg_standard' || normalized.includes('standard')) {
      const guestCount = session.data.guest_count || 0;
      const estimatedCost = guestCount * 770;
      return {
        nextState: 'SELECT_VENUE',
        updatedData: {
          package: 'standard',
          estimated_cost: estimatedCost,
        },
      };
    }

    if (input === 'pkg_premium' || normalized.includes('premium')) {
      const guestCount = session.data.guest_count || 0;
      const estimatedCost = guestCount * 1140;
      return {
        nextState: 'SELECT_VENUE',
        updatedData: {
          package: 'premium',
          estimated_cost: estimatedCost,
        },
      };
    }

    if (input === 'pkg_elite' || normalized.includes('elite')) {
      const guestCount = session.data.guest_count || 0;
      const estimatedCost = guestCount * 2600;
      return {
        nextState: 'SELECT_VENUE',
        updatedData: {
          package: 'elite',
          estimated_cost: estimatedCost,
        },
      };
    }

    return {
      nextState: 'SELECT_PACKAGE',
      error: 'Please select a package from the list: Standard, Premium, or Elite.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const message = createListMessage(
      phone,
      'Based on your event, here are our packages. Each includes a curated menu and decoration.',
      'View Packages',
      [
        {
          title: 'Packages',
          rows: [
            {
              id: 'pkg_standard',
              title: 'Standard',
              description: '₹770 per guest — Classic menu, essential decor',
            },
            {
              id: 'pkg_premium',
              title: 'Premium',
              description: '₹1,140 per guest — Expanded menu, themed decor',
            },
            {
              id: 'pkg_elite',
              title: 'Elite',
              description: '₹2,600 per guest — Luxury menu, grand decor + bar',
            },
          ],
        },
      ],
      'Choose Your Package'
    );

    return createStateResponse('SELECT_PACKAGE', phone, message);
  },
};

export default SELECT_PACKAGE;
