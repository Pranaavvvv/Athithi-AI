import { StateHandler, Session } from '../types';
import { createButtonMessage, createTextMessage, createStateResponse } from '../messageBuilder';

const VISUAL_MENU_SELECTION: StateHandler = {
  handle: async (input: string, session: Session) => {
    const data = session.data;
    const packageTier = data.package;
    const menuType = data.menu_type;

    // Handle custom menu request
    if (input.toLowerCase().includes('custom') || input.toLowerCase().includes('upload') || input.toLowerCase().includes('discuss')) {
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
    if (input.toLowerCase().includes('recommend') || input.toLowerCase().includes('default') || input.toLowerCase().includes('suggested')) {
      let recommendedItems: string[] = [];
      
      if (menuType === 'jain') {
        recommendedItems = ['Hariyali Paneer Tikka', 'Raw Banana Cutlets', 'Paneer Butter Masala', 'Raw Banana & Coconut Sabzi', 'Saffron Rasmalai'];
      } else if (packageTier === 'standard') {
        recommendedItems = ['Paneer Tikka', 'Crispy Veg Salt & Pepper', 'Paneer Butter Masala', 'Dal Tadka', 'Gulab Jamun with Vanilla Ice Cream'];
      } else if (packageTier === 'premium') {
        recommendedItems = ['Hara Bhara Kabab', 'Tandoori Fish Tikka', 'Kadai Paneer', 'Mutton Rogan Josh', 'Hyderabadi Biryani', 'Warm Walnut Brownie', 'Rasmalai'];
      } else if (packageTier === 'elite') {
        recommendedItems = ['Galouti Kebab on Ulte Tawaka Paratha', 'Sushi Roll Platter', 'Shahi Paneer with Saffron', 'Nalli Nihari', 'Dum Pukht Biryani', 'Live Jalebi & Rabri Station'];
      }

      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: recommendedItems.join(', '),
          menu_items_array: recommendedItems,
        },
      };
    }

    // Parse numbered selection
    if (/^\d+(\s*,\s*\d+)*$/.test(input.trim())) {
      const numbers = input.trim().split(/\s*,\s*/).map(num => parseInt(num.trim()));
      let selectedItems: string[] = [];
      
      if (menuType === 'jain') {
        const jainMenu = getJainMenu();
        selectedItems = numbers.map(num => jainMenu[num]).filter(Boolean);
      } else if (packageTier === 'standard') {
        const standardMenu = getStandardMenu();
        selectedItems = numbers.map(num => standardMenu[num]).filter(Boolean);
      } else if (packageTier === 'premium') {
        const premiumMenu = getPremiumMenu();
        selectedItems = numbers.map(num => premiumMenu[num]).filter(Boolean);
      } else if (packageTier === 'elite') {
        const eliteMenu = getEliteMenu();
        selectedItems = numbers.map(num => eliteMenu[num]).filter(Boolean);
      }
      
      if (selectedItems.length > 0) {
        return {
          nextState: 'SELECT_DECORATION',
          updatedData: {
            menu_items: selectedItems.join(', '),
            menu_items_array: selectedItems,
          },
        };
      }
    }

    // Handle confirm/finish
    if (input.toLowerCase().includes('confirm') || input.toLowerCase().includes('done') || input.toLowerCase().includes('finish')) {
      return {
        nextState: 'SELECT_DECORATION',
        updatedData: {
          menu_items: 'Menu to be confirmed based on discussion',
          menu_items_array: ['To be discussed'],
        },
      };
    }

    return {
      nextState: 'VISUAL_MENU_SELECTION',
      error: 'Please select items by number (e.g., "1,2,3"), type "recommended" for chef\'s choice, or "custom" for personalized menu.',
    };
  },

  prompt: async (phone: string, session: Session) => {
    const data = session.data;
    const packageTier = data.package;
    const menuType = data.menu_type;

    let menuText = '';
    
    if (menuType === 'jain') {
      menuText = getJainMenuText();
    } else if (packageTier === 'standard') {
      menuText = getStandardMenuText();
    } else if (packageTier === 'premium') {
      menuText = getPremiumMenuText();
    } else if (packageTier === 'elite') {
      menuText = getEliteMenuText();
    }

    const instructions = `\n\n📝 **How to select:**\n• Type numbers: "1,2,3" (pick 3-5 items)\n• Type "recommended" for chef's selection\n• Type "custom" for personalized menu\n• Type "confirm" when done\n\n⚠️ Please select 3-5 items for a complete menu experience.`;

    const message = createTextMessage(phone, menuText + instructions);

    return createStateResponse('VISUAL_MENU_SELECTION', phone, message);
  },
};

function getStandardMenuText(): string {
  return `🍽️ **STANDARD PACKAGE** - ₹770 per guest\n\n*Classic menu, essential decor*\n*Focus: Familiar comfort food with high-quality execution*\n\n**STARTERS**\n1. Paneer Tikka / Chicken Tikka\n2. Crispy Veg Salt & Pepper\n3. Classic Potato Wedges\n\n**MAIN COURSE**\n4. Paneer Butter Masala\n5. Dal Tadka\n6. Steamed Basmati Rice\n7. Assorted Naans/Rotis\n8. Veg Hakka Noodles\n9. Penne Arrabbiata (Red Sauce Pasta)\n\n**DESSERT**\n10. Gulab Jamun with Vanilla Ice Cream\n\n**BEVERAGES**\n11. Fresh Lime Soda (Sweet/Salted)\n12. Masala Tea/Coffee`;
}

function getPremiumMenuText(): string {
  return `🍽️ **PREMIUM PACKAGE** - ₹1,140 per guest\n\n*Expanded menu, themed decor*\n*Focus: Diverse variety with specialty international dishes*\n\n**STARTERS**\n1. Hara Bhara Kabab\n2. Tandoori Fish Tikka\n3. Malai Chicken Tikka\n4. Cheese Corn Balls\n5. Chicken Sliders\n6. Mini Pizzas\n\n**MAIN COURSE**\n7. Kadai Paneer\n8. Mutton Rogan Josh\n9. Butter Chicken\n10. Hyderabadi Veg/Chicken Biryani\n11. Dal Makhani\n12. Vegetable Lasagna\n13. Grilled Chicken with Mushroom Sauce\n14. Exotic Veg Stir-fry\n\n**DESSERT**\n15. Warm Walnut Brownie with Hot Chocolate Sauce\n16. Rasmalai\n\n**BEVERAGES**\n17. Fruit Punch\n18. Virgin Mojito\n19. Soft Drinks`;
}

function getEliteMenuText(): string {
  return `🍽️ **ELITE PACKAGE** - ₹2,600 per guest\n\n*Luxury menu, grand decor + bar*\n*Focus: Gourmet ingredients, live counters, and premium pairings*\n\n**STARTERS (Passed Appetizers)**\n1. Galouti Kebab on Ulte Tawaka Paratha\n2. Prawns Koliwada\n3. Sushi Roll Platter (Veg/Salmon)\n4. Truffle Parmesan Fries\n5. Bruschetta with Balsamic Glaze\n\n**MAIN COURSE**\n6. Shahi Paneer with Saffron\n7. Nalli Nihari\n8. Prawn Curry\n9. Dum Pukht Biryani\n10. Black Dairy Dal (Slow-cooked 24 hours)\n11. Roasted Lamb Chops\n12. Grilled Salmon\n13. Spinach & Ricotta Ravioli in Sage Butter\n14. Thai Green Curry with Jasmine Rice\n\n**DESSERT**\n15. Live Jalebi & Rabri Station\n16. New York Cheesecake\n17. Seasonal Fruit Tart\n\n**BEVERAGES & BAR**\n18. Premium Whiskey, Vodka, Gin, and Craft Beers\n19. Fresh Fruit Smoothies\n20. Sparkling Water\n21. Kombucha`;
}

function getJainMenuText(): string {
  return `🍽️ **JAIN SPECIAL PACKAGE** - ₹950 per guest\n\n*(Pure Jain | No Root Vegetables | Sattvic Prep)*\n\n**STARTERS (Pick 3)**\n1. Hariyali Paneer Tikka (Mint & Cilantro Marinade)\n2. Raw Banana Cutlets (Spiced & Pan-Seared)\n3. Crispy Corn with Kaffir Lime (Oriental Style)\n4. Moong Dal Dhokla (Steamed & Tempered)\n5. Paneer Satay (with Peanut Dipping Sauce)\n\n**MAIN COURSE - INDIAN (Pick 3)**\n6. Paneer Butter Masala (Rich Cashew & Tomato Gravy)\n7. Raw Banana & Coconut Sabzi (South Indian Style)\n8. Dal Makhani (Jain Style - Slow Cooked Yellow Lentils)\n9. Steamed Basmati Rice / Jeera Rice\n10. Assorted Breads (Plain Naan & Tandoori Roti)\n11. Vegetable Makhanwala (Seasonal Veggies in Makhani Sauce)\n\n**MAIN COURSE - GLOBAL (Pick 1)**\n12. Jain Penne Arrabbiata (No-Garlic Spicy Red Sauce)\n13. Jain Veg Hakka Noodles (with Cabbage & Bell Peppers)\n\n**DESSERT & BEVERAGE (Pick 1 each)**\n14. Saffron Rasmalai\n15. Gulab Jamun with Vanilla Ice Cream\n16. Fresh Lime Soda (Sweet/Salted)\n17. Kokum Sharbat (Refreshing Coastal Cooler)`;
}

function getStandardMenu(): Record<number, string> {
  return {
    1: 'Paneer Tikka / Chicken Tikka',
    2: 'Crispy Veg Salt & Pepper',
    3: 'Classic Potato Wedges',
    4: 'Paneer Butter Masala',
    5: 'Dal Tadka',
    6: 'Steamed Basmati Rice',
    7: 'Assorted Naans/Rotis',
    8: 'Veg Hakka Noodles',
    9: 'Penne Arrabbiata (Red Sauce Pasta)',
    10: 'Gulab Jamun with Vanilla Ice Cream',
    11: 'Fresh Lime Soda (Sweet/Salted)',
    12: 'Masala Tea/Coffee'
  };
}

function getPremiumMenu(): Record<number, string> {
  return {
    1: 'Hara Bhara Kabab',
    2: 'Tandoori Fish Tikka',
    3: 'Malai Chicken Tikka',
    4: 'Cheese Corn Balls',
    5: 'Chicken Sliders',
    6: 'Mini Pizzas',
    7: 'Kadai Paneer',
    8: 'Mutton Rogan Josh',
    9: 'Butter Chicken',
    10: 'Hyderabadi Veg/Chicken Biryani',
    11: 'Dal Makhani',
    12: 'Vegetable Lasagna',
    13: 'Grilled Chicken with Mushroom Sauce',
    14: 'Exotic Veg Stir-fry',
    15: 'Warm Walnut Brownie with Hot Chocolate Sauce',
    16: 'Rasmalai',
    17: 'Fruit Punch',
    18: 'Virgin Mojito',
    19: 'Soft Drinks'
  };
}

function getEliteMenu(): Record<number, string> {
  return {
    1: 'Galouti Kebab on Ulte Tawaka Paratha',
    2: 'Prawns Koliwada',
    3: 'Sushi Roll Platter (Veg/Salmon)',
    4: 'Truffle Parmesan Fries',
    5: 'Bruschetta with Balsamic Glaze',
    6: 'Shahi Paneer with Saffron',
    7: 'Nalli Nihari',
    8: 'Prawn Curry',
    9: 'Dum Pukht Biryani',
    10: 'Black Dairy Dal (Slow-cooked 24 hours)',
    11: 'Roasted Lamb Chops',
    12: 'Grilled Salmon',
    13: 'Spinach & Ricotta Ravioli in Sage Butter',
    14: 'Thai Green Curry with Jasmine Rice',
    15: 'Live Jalebi & Rabri Station',
    16: 'New York Cheesecake',
    17: 'Seasonal Fruit Tart',
    18: 'Premium Bar (Whiskey, Vodka, Gin, Craft Beers)',
    19: 'Fresh Fruit Smoothies',
    20: 'Sparkling Water',
    21: 'Kombucha'
  };
}

function getJainMenu(): Record<number, string> {
  return {
    1: 'Hariyali Paneer Tikka (Mint & Cilantro Marinade)',
    2: 'Raw Banana Cutlets (Spiced & Pan-Seared)',
    3: 'Crispy Corn with Kaffir Lime (Oriental Style)',
    4: 'Moong Dal Dhokla (Steamed & Tempered)',
    5: 'Paneer Satay (with Peanut Dipping Sauce)',
    6: 'Paneer Butter Masala (Rich Cashew & Tomato Gravy)',
    7: 'Raw Banana & Coconut Sabzi (South Indian Style)',
    8: 'Dal Makhani (Jain Style - Slow Cooked Yellow Lentils)',
    9: 'Steamed Basmati Rice / Jeera Rice',
    10: 'Assorted Breads (Plain Naan & Tandoori Roti)',
    11: 'Vegetable Makhanwala (Seasonal Veggies in Makhani Sauce)',
    12: 'Jain Penne Arrabbiata (No-Garlic Spicy Red Sauce)',
    13: 'Jain Veg Hakka Noodles (with Cabbage & Bell Peppers)',
    14: 'Saffron Rasmalai',
    15: 'Gulab Jamun with Vanilla Ice Cream',
    16: 'Fresh Lime Soda (Sweet/Salted)',
    17: 'Kokum Sharbat (Refreshing Coastal Cooler)'
  };
}

export default VISUAL_MENU_SELECTION;
