import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export interface Hall {
  id: string;
  name: string;
  capacity: number;
  description: string;
  price_per_head_surcharge: number;
  available_slots: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'starter' | 'main' | 'dessert' | 'beverage';
  type: 'veg' | 'nonveg' | 'jain';
  packages: string[];
  description: string;
  recommended: boolean;
}

export interface Decoration {
  id: string;
  name: string;
  packages: string[];
  description: string;
}

export interface PackageInfo {
  price_per_guest: number;
  label: string;
}

export interface DataContext {
  today: string;
  halls: Hall[];
  packages: {
    standard: PackageInfo;
    premium: PackageInfo;
    elite: PackageInfo;
  };
  menu_items: MenuItem[];
  decorations: Decoration[];
  payment: {
    upi_id: string;
    payment_link: string;
  };
}

/**
 * Get available halls for a specific date and time slot
 */
export async function getAvailableHalls(date: string, timeSlot: string, minCapacity: number): Promise<Hall[]> {
  // Query booked slots from database
  const bookedResult = await pool.query(
    `SELECT venue_id, venue_name FROM enquiries 
     WHERE event_date = $1 AND event_time_slot = $2 AND status = 'BOOKED'`,
    [date, timeSlot]
  );

  const bookedHallIds = new Set(bookedResult.rows.map((row: any) => row.venue_id));

  // Get all halls
  const allHalls = getHalls();

  // Filter by availability and capacity
  return allHalls.filter(
    (hall) =>
      !bookedHallIds.has(hall.id) &&
      hall.capacity >= minCapacity &&
      hall.available_slots.includes(timeSlot.toLowerCase())
  );
}

/**
 * Get all halls (static data - can be moved to database later)
 */
export function getHalls(): Hall[] {
  return [
    {
      id: 'hall_main',
      name: 'Main Banquet Hall',
      capacity: 500,
      description: 'Grand hall with stage, AV setup, air-conditioned',
      price_per_head_surcharge: 0,
      available_slots: ['morning', 'afternoon', 'evening'],
    },
    {
      id: 'hall_rooftop',
      name: 'Rooftop Lounge',
      capacity: 100,
      description: 'Intimate setting with city views, perfect for cocktails',
      price_per_head_surcharge: 50,
      available_slots: ['afternoon', 'evening'],
    },
    {
      id: 'hall_garden',
      name: 'Garden Area',
      capacity: 300,
      description: 'Open-air venue, ideal for daytime events',
      price_per_head_surcharge: 0,
      available_slots: ['morning', 'afternoon'],
    },
    {
      id: 'hall_poolside',
      name: 'Poolside',
      capacity: 200,
      description: 'Modern vibe with pool access, great for parties',
      price_per_head_surcharge: 30,
      available_slots: ['afternoon', 'evening'],
    },
  ];
}

/**
 * Get menu items filtered by package and menu type
 */
export function getMenuItems(packageTier?: string, menuType?: string, category?: string): MenuItem[] {
  const allItems: MenuItem[] = [
    // Standard - Veg Starters
    { id: 'item_001', name: 'Paneer Tikka', category: 'starter', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Smoky cottage cheese skewers', recommended: true },
    { id: 'item_002', name: 'Veg Spring Rolls', category: 'starter', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Crispy vegetable rolls', recommended: true },
    { id: 'item_003', name: 'Aloo Tikki Chaat', category: 'starter', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Spiced potato patties with chutneys', recommended: false },
    
    // Standard - Mains
    { id: 'item_011', name: 'Dal Makhani', category: 'main', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Creamy black lentils', recommended: true },
    { id: 'item_012', name: 'Jeera Rice', category: 'main', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Cumin-flavored basmati rice', recommended: true },
    { id: 'item_013', name: 'Mixed Veg Curry', category: 'main', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Seasonal vegetables in gravy', recommended: true },
    { id: 'item_014', name: 'Butter Naan', category: 'main', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Soft leavened bread', recommended: true },
    
    // Standard - Desserts
    { id: 'item_021', name: 'Gulab Jamun', category: 'dessert', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Sweet milk dumplings in syrup', recommended: true },
    { id: 'item_022', name: 'Ice Cream', category: 'dessert', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Assorted flavors', recommended: true },
    
    // Standard - Beverages
    { id: 'item_031', name: 'Soft Drinks', category: 'beverage', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Coke, Sprite, Fanta', recommended: true },
    { id: 'item_032', name: 'Masala Chai', category: 'beverage', type: 'veg', packages: ['standard', 'premium', 'elite'], description: 'Spiced Indian tea', recommended: false },
    
    // Premium - Starters
    { id: 'item_101', name: 'Hara Bhara Kebab', category: 'starter', type: 'veg', packages: ['premium', 'elite'], description: 'Spinach and pea patties', recommended: true },
    { id: 'item_102', name: 'Tandoori Mushroom', category: 'starter', type: 'veg', packages: ['premium', 'elite'], description: 'Clay oven roasted mushrooms', recommended: true },
    { id: 'item_103', name: 'Chicken Tikka', category: 'starter', type: 'nonveg', packages: ['premium', 'elite'], description: 'Marinated grilled chicken', recommended: true },
    
    // Premium - Mains
    { id: 'item_111', name: 'Paneer Butter Masala', category: 'main', type: 'veg', packages: ['premium', 'elite'], description: 'Cottage cheese in rich tomato gravy', recommended: true },
    { id: 'item_112', name: 'Hyderabadi Biryani', category: 'main', type: 'veg', packages: ['premium', 'elite'], description: 'Aromatic rice with vegetables', recommended: true },
    { id: 'item_113', name: 'Chicken Biryani', category: 'main', type: 'nonveg', packages: ['premium', 'elite'], description: 'Aromatic rice with chicken', recommended: true },
    { id: 'item_114', name: 'Garlic Naan', category: 'main', type: 'veg', packages: ['premium', 'elite'], description: 'Garlic-infused bread', recommended: true },
    
    // Premium - Desserts
    { id: 'item_121', name: 'Rasmalai', category: 'dessert', type: 'veg', packages: ['premium', 'elite'], description: 'Cottage cheese in sweet milk', recommended: true },
    { id: 'item_122', name: 'Phirni', category: 'dessert', type: 'veg', packages: ['premium', 'elite'], description: 'Rice pudding with nuts', recommended: true },
    
    // Premium - Beverages
    { id: 'item_131', name: 'Fresh Lime Soda', category: 'beverage', type: 'veg', packages: ['premium', 'elite'], description: 'Refreshing citrus drink', recommended: true },
    { id: 'item_132', name: 'Masala Chaas', category: 'beverage', type: 'veg', packages: ['premium', 'elite'], description: 'Spiced buttermilk', recommended: false },
    
    // Elite - Starters
    { id: 'item_201', name: 'Truffle Mushroom Vol-au-Vent', category: 'starter', type: 'veg', packages: ['elite'], description: 'Puff pastry with truffle mushrooms', recommended: true },
    { id: 'item_202', name: 'Saffron Paneer Tikka', category: 'starter', type: 'veg', packages: ['elite'], description: 'Premium cottage cheese with saffron', recommended: true },
    { id: 'item_203', name: 'Lobster Bisque Shots', category: 'starter', type: 'nonveg', packages: ['elite'], description: 'Creamy lobster soup', recommended: true },
    
    // Elite - Mains
    { id: 'item_211', name: 'Truffle Risotto', category: 'main', type: 'veg', packages: ['elite'], description: 'Creamy Italian rice with truffle', recommended: true },
    { id: 'item_212', name: 'Lamb Shank Rogan Josh', category: 'main', type: 'nonveg', packages: ['elite'], description: 'Slow-cooked lamb in aromatic gravy', recommended: true },
    { id: 'item_213', name: 'Lobster Thermidor', category: 'main', type: 'nonveg', packages: ['elite'], description: 'Baked lobster in cream sauce', recommended: true },
    { id: 'item_214', name: 'Artisan Sourdough', category: 'main', type: 'veg', packages: ['elite'], description: 'Freshly baked bread', recommended: true },
    
    // Elite - Desserts
    { id: 'item_221', name: 'Belgian Chocolate Mousse', category: 'dessert', type: 'veg', packages: ['elite'], description: 'Rich chocolate dessert', recommended: true },
    { id: 'item_222', name: 'Saffron Crème Brûlée', category: 'dessert', type: 'veg', packages: ['elite'], description: 'Caramelized custard with saffron', recommended: true },
    
    // Elite - Beverages
    { id: 'item_231', name: 'Mocktail Bar', category: 'beverage', type: 'veg', packages: ['elite'], description: 'Assorted premium mocktails', recommended: true },
    { id: 'item_232', name: 'Premium Coffee Station', category: 'beverage', type: 'veg', packages: ['elite'], description: 'Espresso, cappuccino, latte', recommended: true },
    
    // Jain options
    { id: 'item_301', name: 'Jain Spring Rolls', category: 'starter', type: 'jain', packages: ['standard', 'premium', 'elite'], description: 'No onion, no garlic', recommended: true },
    { id: 'item_302', name: 'Jain Paneer Tikka', category: 'starter', type: 'jain', packages: ['standard', 'premium', 'elite'], description: 'No onion, no garlic', recommended: true },
    { id: 'item_311', name: 'Jain Dal Tadka', category: 'main', type: 'jain', packages: ['standard', 'premium', 'elite'], description: 'Lentils without onion/garlic', recommended: true },
    { id: 'item_312', name: 'Jain Veg Curry', category: 'main', type: 'jain', packages: ['standard', 'premium', 'elite'], description: 'Vegetables without root items', recommended: true },
  ];

  let filtered = allItems;

  if (packageTier) {
    filtered = filtered.filter((item) => item.packages.includes(packageTier.toLowerCase()));
  }

  if (menuType) {
    if (menuType === 'veg') {
      filtered = filtered.filter((item) => item.type === 'veg');
    } else if (menuType === 'nonveg') {
      filtered = filtered.filter((item) => item.type === 'veg' || item.type === 'nonveg');
    } else if (menuType === 'jain') {
      filtered = filtered.filter((item) => item.type === 'jain');
    }
  }

  if (category) {
    filtered = filtered.filter((item) => item.category === category);
  }

  return filtered;
}

/**
 * Get decorations filtered by package
 */
export function getDecorations(packageTier?: string): Decoration[] {
  const allDecorations: Decoration[] = [
    {
      id: 'decor_minimalist',
      name: 'Minimalist Floral',
      packages: ['standard', 'premium', 'elite'],
      description: 'Simple elegant flower arrangements',
    },
    {
      id: 'decor_theme',
      name: 'Theme Based',
      packages: ['premium', 'elite'],
      description: 'Custom themes (Vintage, Neon, Royal, Rustic)',
    },
    {
      id: 'decor_grand',
      name: 'Grand Extravaganza',
      packages: ['elite'],
      description: 'Imported flowers, chandeliers, LED setups',
    },
  ];

  if (packageTier) {
    return allDecorations.filter((decor) => decor.packages.includes(packageTier.toLowerCase()));
  }

  return allDecorations;
}

/**
 * Get complete data context for a session
 */
export async function getDataContext(): Promise<DataContext> {
  const today = new Date().toISOString().split('T')[0];

  return {
    today,
    halls: getHalls(),
    packages: {
      standard: { price_per_guest: 770, label: 'Standard' },
      premium: { price_per_guest: 1140, label: 'Premium' },
      elite: { price_per_guest: 2600, label: 'Elite' },
    },
    menu_items: getMenuItems(),
    decorations: getDecorations(),
    payment: {
      upi_id: process.env.UPI_ID || 'athithiai@bank',
      payment_link: process.env.PAYMENT_LINK || 'https://pay.example.com/athithiai',
    },
  };
}
