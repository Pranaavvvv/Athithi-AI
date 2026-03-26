require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const vendors = [
  { name: "Symphony Sound Co.", category: "sound", reliability: 9.2, price: 45000, efficiency: { friction_score: 2, reasoning: "Always arrives 2 hours early. Great equipment." } },
  { name: "Bass Drop Entertainment", category: "dj", reliability: 8.5, price: 20000, efficiency: { friction_score: 4, reasoning: "Sometimes late, but excellent crowd control." } },
  { name: "Elite Banquets Catering", category: "kitchen", reliability: 9.8, price: 150000, efficiency: { friction_score: 1, reasoning: "Flawless execution of VIP menus." } },
  { name: "Spice Route Kitchens", category: "kitchen", reliability: 8.0, price: 80000, efficiency: { friction_score: 6, reasoning: "Good food but slow service during peak hours." } },
  { name: "Aura Decorators", category: "decor", reliability: 9.5, price: 120000, efficiency: { friction_score: 2, reasoning: "Creative setups and zero delays." } },
  { name: "Floral Petals & Co.", category: "decor", reliability: 7.5, price: 60000, efficiency: { friction_score: 8, reasoning: "Needs heavy supervision for setup." } },
  { name: "Sonic Boom Audio", category: "sound", reliability: 8.8, price: 35000, efficiency: { friction_score: 3, reasoning: "Solid middle-tier option." } },
  { name: "Neon Nights DJ", category: "dj", reliability: 9.1, price: 25000, efficiency: { friction_score: 2, reasoning: "Extensive library and great MC skills." } },
  { name: "Royal Feast Caterers", category: "kitchen", reliability: 8.9, price: 110000, efficiency: { friction_score: 3, reasoning: "Consistent quality across all tiers." } },
  { name: "Luxe Events Decor", category: "decor", reliability: 9.0, price: 95000, efficiency: { friction_score: 2, reasoning: "Premium materials, easy to work with." } }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Ensure table exists and has the necessary columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL
      );
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_coords VARCHAR(255);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS historical_reliability_score NUMERIC(3,1);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS base_price_point NUMERIC(15,2);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS efficiency_pilot JSONB;
    `);

    // Clear existing to avoid duplicates in this demo
    await client.query("DELETE FROM vendors");

    for (const v of vendors) {
      await client.query(
        `INSERT INTO vendors (name, category, historical_reliability_score, base_price_point, efficiency_pilot)
         VALUES ($1, $2, $3, $4, $5)`,
        [v.name, v.category, v.reliability, v.price, JSON.stringify(v.efficiency)]
      );
    }
    
    await client.query("COMMIT");
    console.log("✅ Seeded vendors successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
