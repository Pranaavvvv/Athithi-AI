import { StateHandler, Session } from '../types';
import { getMenuItems } from '../dataContext';
import { createListMessage, createButtonMessage, createTextMessage, createStateResponse } from '../messageBuilder';

const CATEGORIES = ['starter', 'main', 'dessert', 'beverage'];

const SELECT_MENU_ITEMS: StateHandler = {
  handle: async (input: string, session: Session) => {
    const data = session.data;
    const currentCategory = data.menu_current_category || 'starter';
    const selectedItems = data.menu_items_array || [];

    // Handle "recommended" or "default" selection
    if (input.toLowerCase().includes('recommend') || input.toLowerCase().includes('default')) {
      const packageTier = data.package;
      const menuType = data.menu_type;
      
      const allRecommended: string[] = [];
      CATEGORIES.forEach((cat) => {
        const items = getMenuItems(packageTier, menuType, cat);
        const recommended = items.filter((item) => item.recommended).slice(0, 2);
        allRecommended.push(...recommended.map((item) => item.name));
      });

      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: allRecommended.join(', '),
          menu_items_array: allRecommended,
          menu_current_category: undefined,
        },
      };
    }

    // Handle custom menu request
    if (input.toLowerCase().includes('custom') || input.toLowerCase().includes('upload') || input.toLowerCase().includes('file')) {
      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: 'Custom menu requested - Will be discussed with event team',
          menu_items_array: ['Custom menu'],
          menu_current_category: undefined,
          custom_menu_request: true,
        },
      };
    }

    // Handle multiple item selection (comma-separated or numbered)
    if (input.includes(',') || input.includes(' and ') || /^\d+(\s*,\s*\d+)*$/.test(input.trim())) {
      const packageTier = data.package;
      const menuType = data.menu_type;
      const items = getMenuItems(packageTier, menuType, currentCategory);
      
      let itemIds: string[] = [];
      
      // Parse comma-separated IDs
      if (input.includes(',')) {
        itemIds = input.split(',').map(id => id.trim());
      } else if (input.includes(' and ')) {
        itemIds = input.split(' and ').map(id => id.trim());
      } else if (/^\d+(\s*,\s*\d+)*$/.test(input.trim())) {
        itemIds = input.trim().split(/\s*,\s*/).map(id => id.trim());
      }
      
      const newlySelectedItems: string[] = [];
      for (const itemId of itemIds) {
        const selectedItem = items.find(
          (item) => item.id === itemId || item.name.toLowerCase().includes(itemId.toLowerCase())
        );
        if (selectedItem) {
          newlySelectedItems.push(selectedItem.name);
        }
      }
      
      if (newlySelectedItems.length > 0) {
        selectedItems.push(...newlySelectedItems);
        return {
          nextState: 'SELECT_MENU_ITEMS',
          updatedData: {
            menu_items_array: selectedItems,
            menu_selection_pending: true,
          },
        };
      }
    }

    // Handle "add more" or "next course"
    if (input === 'add_more' || input.toLowerCase().includes('add more')) {
      return { 
        nextState: 'SELECT_MENU_ITEMS', 
        updatedData: { menu_selection_pending: false } 
      };
    }

    if (input === 'next_course' || input.toLowerCase().includes('next')) {
      const currentIndex = CATEGORIES.indexOf(currentCategory);
      if (currentIndex < CATEGORIES.length - 1) {
        return {
          nextState: 'SELECT_MENU_ITEMS',
          updatedData: { 
            menu_current_category: CATEGORIES[currentIndex + 1],
            menu_selection_pending: false 
          },
        };
      } else {
        return {
          nextState: 'SELECT_DECORATION',
          updatedData: {
            menu_items: selectedItems.join(', '),
            menu_current_category: undefined,
          },
        };
      }
    }

    // Handle single item selection (by ID or name)
    const packageTier = data.package;
    const menuType = data.menu_type;
    const items = getMenuItems(packageTier, menuType, currentCategory);
    
    const selectedItem = items.find(
      (item) => item.id === input || item.name.toLowerCase().includes(input.toLowerCase())
    );

    if (selectedItem) {
      selectedItems.push(selectedItem.name);
      return {
        nextState: 'SELECT_MENU_ITEMS',
        updatedData: {
          menu_items_array: selectedItems,
          menu_selection_pending: true,
        },
      };
    }

    return {
      nextState: 'SELECT_MENU_ITEMS',
      error: 'Please select items from the list. You can select multiple items using commas (e.g., "item_001, item_002") or type "custom" for custom menu.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const currentCategory = data.menu_current_category || 'starter';
    const packageTier = data.package;
    const menuType = data.menu_type;

    // If user just selected items, ask if they want more
    if (data.menu_selection_pending) {
      const message = createButtonMessage(
        phone,
        `Great choices for ${currentCategory}s! Add more items or proceed to next course?`,
        [
          { id: 'add_more', title: '➕ Add More Items' },
          { id: 'next_course', title: '➡️ Next Course' },
          { id: 'custom_menu', title: '📝 Custom Menu Request' },
        ]
      );
      
      return createStateResponse('SELECT_MENU_ITEMS', phone, message, {
        menu_selection_pending: false
      });
    }

    const items = getMenuItems(packageTier, menuType, currentCategory);

    // If no items available, automatically move to next category
    if (items.length === 0) {
      const currentIndex = CATEGORIES.indexOf(currentCategory);
      
      if (currentIndex < CATEGORIES.length - 1) {
        const nextCategory = CATEGORIES[currentIndex + 1];
        const nextItems = getMenuItems(packageTier, menuType, nextCategory);
        
        if (nextItems.length > 0) {
          const message = createTextMessage(
            phone,
            `No ${currentCategory}s available for your selection. Moving to ${nextCategory}s...`
          );
          
          return createStateResponse('SELECT_MENU_ITEMS', phone, message, {
            menu_current_category: nextCategory
          });
        } else {
          const message = createTextMessage(
            phone,
            `No ${currentCategory}s available. Skipping to next course...`
          );
          
          return createStateResponse('SELECT_MENU_ITEMS', phone, message, {
            menu_current_category: CATEGORIES[currentIndex + 1]
          });
        }
      } else {
        const selectedItems = data.menu_items_array || [];
        const message = createTextMessage(phone, 'Menu selection complete!');
        
        return createStateResponse('SELECT_DECORATION', phone, message, {
          menu_items: selectedItems.join(', '),
          menu_current_category: undefined,
        });
      }
    }

    const categoryLabel = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1) + 's';
    
    // Create enhanced menu with photos and better descriptions
    const rows = items.map((item, index) => ({
      id: item.id,
      title: `${index + 1}. ${item.name} ${item.recommended ? '⭐' : ''}`,
      description: `${item.description} • ${item.type.toUpperCase()}`,
    }));

    const message = createListMessage(
      phone,
      `🍽️ **${categoryLabel} Selection**\n\n💡 *Tips:*\n• Select multiple items: "1, 3, 5" or "Paneer Tikka, Dal Makhani"\n• Type "custom" for personalized menu\n• Type "recommended" for chef's selection`,
      'Choose Items',
      [
        {
          title: `${categoryLabel} Menu (${items.length} items)`,
          rows,
        },
      ],
      `📋 ${categoryLabel} — Select Multiple Items`
    );

    return createStateResponse('SELECT_MENU_ITEMS', phone, message);
  },
};

export default SELECT_MENU_ITEMS;
