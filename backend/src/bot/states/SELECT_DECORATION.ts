import { StateHandler, Session } from '../types';
import { getDecorations } from '../dataContext';
import { createListMessage, createStateResponse } from '../messageBuilder';

const SELECT_DECORATION: StateHandler = {
  handle: async (input: string, session: Session) => {
    const packageTier = session.data.package;
    const decorations = getDecorations(packageTier);
    
    const selectedDecor = decorations.find(
      (d) => d.id === input || d.name.toLowerCase().includes(input.toLowerCase())
    );

    if (selectedDecor) {
      return {
        nextState: 'SUMMARY_CONFIRM',
        updatedData: {
          decoration_id: selectedDecor.id,
          decoration_name: selectedDecor.name,
        },
      };
    }

    return {
      nextState: 'SELECT_DECORATION',
      error: 'Please select a decoration option from the list.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const packageTier = session.data.package;
    const decorations = getDecorations(packageTier);

    const rows = decorations.map((decor) => ({
      id: decor.id,
      title: decor.name,
      description: decor.description,
    }));

    const message = createListMessage(
      phone,
      `Choose a decoration theme for your event. Options are curated for the ${packageTier} package.`,
      'Choose Theme',
      [
        {
          title: 'Decoration Styles',
          rows,
        },
      ],
      'Decoration Style'
    );

    return createStateResponse('SELECT_DECORATION', phone, message);
  },
};

export default SELECT_DECORATION;
