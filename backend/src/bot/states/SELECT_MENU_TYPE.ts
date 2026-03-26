import { StateHandler, Session } from '../types';
import { createButtonMessage, createStateResponse } from '../messageBuilder';

const SELECT_MENU_TYPE: StateHandler = {
  handle: async (input: string, session: Session) => {
    const normalized = input.toLowerCase();

    // Handle menu type selection
    if (input === 'menu_veg' || normalized.includes('veg') && !normalized.includes('non')) {
      return {
        nextState: 'VISUAL_MENU_SELECTION',
        updatedData: { menu_type: 'veg' },
      };
    }

    if (input === 'menu_nonveg' || normalized.includes('non') || normalized.includes('chicken') || normalized.includes('meat')) {
      return {
        nextState: 'VISUAL_MENU_SELECTION',
        updatedData: { menu_type: 'nonveg' },
      };
    }

    if (input === 'menu_jain' || normalized.includes('jain')) {
      return {
        nextState: 'VISUAL_MENU_SELECTION',
        updatedData: { menu_type: 'jain' },
      };
    }

    // Handle menu style selection (if already have menu_type)
    if (session.data.menu_type) {
      if (input === 'style_step' || normalized.includes('step') || normalized.includes('traditional')) {
        return {
          nextState: 'SELECT_MENU_ITEMS',
          updatedData: { menu_style: 'step_by_step' },
        };
      }

      if (input === 'style_comprehensive' || normalized.includes('comprehensive') || normalized.includes('all') || normalized.includes('complete')) {
        return {
          nextState: 'COMPREHENSIVE_MENU',
          updatedData: { menu_style: 'comprehensive' },
        };
      }

      if (input === 'style_visual' || normalized.includes('visual') || normalized.includes('image') || normalized.includes('photo')) {
        return {
          nextState: 'VISUAL_MENU_SELECTION',
          updatedData: { menu_style: 'visual' },
        };
      }
    }

    return {
      nextState: 'SELECT_MENU_TYPE',
      error: 'Please select a menu type and style from the options provided.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const eventName = session.data.event_name || 'your event';
    
    // First, ask for menu type (veg/nonveg/jain)
    if (!session.data.menu_type) {
      const message = createButtonMessage(
        phone,
        `🍽️ What type of menu would you like for ${eventName}?`,
        [
          { id: 'menu_veg', title: '🥗 Pure Vegetarian' },
          { id: 'menu_nonveg', title: '🍗 Vegetarian + Non-Veg' },
          { id: 'menu_jain', title: '🌿 Jain Menu' },
        ]
      );

      return createStateResponse('SELECT_MENU_TYPE', phone, message);
    }
    
    // Then, ask for menu selection style
    const message = createButtonMessage(
      phone,
      `📋 How would you prefer to select your menu items?`,
      [
        { id: 'style_visual', title: '🖼️ Visual Menu (Recommended)' },
        { id: 'style_step', title: '📝 Step-by-Step' },
        { id: 'style_comprehensive', title: '📚 Complete List View' },
        { id: 'custom_menu', title: '🎨 Custom Menu Request' },
      ]
    );

    return createStateResponse('SELECT_MENU_TYPE', phone, message);
  },
};

export default SELECT_MENU_TYPE;
