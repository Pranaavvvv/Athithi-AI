import { StateHandler, Session } from '../types';
import { getMenuItems } from '../dataContext';
import { createListMessage, createButtonMessage, createTextMessage, createStateResponse } from '../messageBuilder';

const COMPREHENSIVE_MENU: StateHandler = {
  handle: async (input: string, session: Session) => {
    const data = session.data;
    const packageTier = data.package;
    const menuType = data.menu_type;
    const selectedItems = data.menu_items_array || [];

    // Handle custom menu request
    if (input.toLowerCase().includes('custom') || input.toLowerCase().includes('upload') || input.toLowerCase().includes('file')) {
      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: 'Custom menu requested - Will be discussed with event team',
          menu_items_array: ['Custom menu'],
          custom_menu_request: true,
        },
      };
    }

    // Handle recommended selection
    if (input.toLowerCase().includes('recommend') || input.toLowerCase().includes('default')) {
      const allRecommended: string[] = [];
      ['starter', 'main', 'dessert', 'beverage'].forEach((cat) => {
        const items = getMenuItems(packageTier, menuType, cat);
        const recommended = items.filter((item) => item.recommended).slice(0, 2);
        allRecommended.push(...recommended.map((item) => item.name));
      });

      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: allRecommended.join(', '),
          menu_items_array: allRecommended,
        },
      };
    }

    // Handle multi-category selection
    if (input.includes(',') || input.includes(' and ') || input.length > 3) {
      const allItems: any[] = [];
      ['starter', 'main', 'dessert', 'beverage'].forEach((cat) => {
        const items = getMenuItems(packageTier, menuType, cat);
        allItems.push(...items);
      });
      
      let itemIds: string[] = [];
      if (input.includes(',')) {
        itemIds = input.split(',').map(id => id.trim());
      } else if (input.includes(' and ')) {
        itemIds = input.split(' and ').map(id => id.trim());
      } else {
        itemIds = [input.trim()];
      }
      
      const newlySelectedItems: string[] = [];
      for (const itemId of itemIds) {
        const selectedItem = allItems.find(
          (item) => item.id === itemId || 
                   item.name.toLowerCase().includes(itemId.toLowerCase()) ||
                   itemId === item.name
        );
        if (selectedItem && !selectedItems.includes(selectedItem.name)) {
          newlySelectedItems.push(selectedItem.name);
        }
      }
      
      if (newlySelectedItems.length > 0) {
        selectedItems.push(...newlySelectedItems);
        return {
          nextState: 'COMPREHENSIVE_MENU',
          updatedData: {
            menu_items_array: selectedItems,
            menu_selection_pending: true,
          },
        };
      }
    }

    // Handle confirm selection
    if (input.toLowerCase().includes('confirm') || input.toLowerCase().includes('done') || input.toLowerCase().includes('finish')) {
      if (selectedItems.length === 0) {
        return {
          nextState: 'COMPREHENSIVE_MENU',
          error: 'Please select at least one item before confirming.',
        };
      }
      
      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: selectedItems.join(', '),
          menu_items_array: selectedItems,
        },
      };
    }

    // Handle clear selection
    if (input.toLowerCase().includes('clear') || input.toLowerCase().includes('reset')) {
      return {
        nextState: 'COMPREHENSIVE_MENU',
        updatedData: {
          menu_items_array: [],
          menu_selection_pending: false,
        },
      };
    }

    return {
      nextState: 'COMPREHENSIVE_MENU',
      error: 'Please select items by name/ID (e.g., "Paneer Tikka, Dal Makhani"), type "recommended", "custom", or "confirm" when done.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const packageTier = data.package;
    const menuType = data.menu_type;
    const selectedItems = data.menu_items_array || [];

    // If user just selected items, show current selection and options
    if (data.menu_selection_pending) {
      const selectionText = selectedItems.length > 0 
        ? `📋 **Current Selection (${selectedItems.length} items):**\n${selectedItems.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}\n\n`
        : '';
      
      const message = createButtonMessage(
        phone,
        `${selectionText}Add more items or confirm your selection?`,
        [
          { id: 'add_more', title: '➕ Add More Items' },
          { id: 'confirm', title: '✅ Confirm Selection' },
          { id: 'clear', title: '🗑️ Clear Selection' },
          { id: 'custom', title: '📝 Custom Menu' },
        ]
      );
      
      return createStateResponse('COMPREHENSIVE_MENU', phone, message, {
        menu_selection_pending: false
      });
    }

    // Create comprehensive menu with all categories
    const categories = [
      { name: 'Starters', key: 'starter', emoji: '🥗' },
      { name: 'Main Course', key: 'main', emoji: '🍛' },
      { name: 'Desserts', key: 'dessert', emoji: '🍰' },
      { name: 'Beverages', key: 'beverage', emoji: '🥤' },
    ];

    const sections = categories.map((cat) => {
      const items = getMenuItems(packageTier, menuType, cat.key);
      const rows = items.map((item, index) => ({
        id: item.id,
        title: `${item.name} ${item.recommended ? '⭐' : ''}`,
        description: `${item.description} • ${item.type.toUpperCase()}`,
      }));
      
      return {
        title: `${cat.emoji} ${cat.name} (${items.length} items)`,
        rows,
      };
    });

    const message = createListMessage(
      phone,
      `🍽️ **Complete Menu Selection**\n\n${packageTier?.toUpperCase()} • ${menuType?.toUpperCase()}\n\n💡 *How to select:*\n• Multiple items: "Paneer Tikka, Dal Makhani"\n• By ID: "item_001, item_011"\n• Type "recommended" for chef's choice\n• Type "custom" for personalized menu`,
      'Browse Menu',
      sections,
      `📋 Complete Menu — ${packageTier?.toUpperCase()} Package`
    );

    return createStateResponse('COMPREHENSIVE_MENU', phone, message);
  },
};

export default COMPREHENSIVE_MENU;
