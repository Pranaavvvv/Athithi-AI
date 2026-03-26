/**
 * Food Intelligence — Database Migration
 * Creates food_consumption and food_recommendations tables.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require("pg");

let connectionString = process.env.DATABASE_URL;
if (connectionString) connectionString = connectionString.trim();

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Food Consumption — tracks actual dish-level consumption per event
    await client.query(`
      CREATE TABLE IF NOT EXISTS food_consumption (
        id SERIAL PRIMARY KEY,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity_prepared INT DEFAULT 0,
        quantity_consumed INT DEFAULT 0,
        quantity_wasted INT GENERATED ALWAYS AS (quantity_prepared - quantity_consumed) STORED,
        unit VARCHAR(50) DEFAULT 'portions',
        notes TEXT,
        logged_by VARCHAR(255) DEFAULT 'chef',
        logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(" food_consumption table created");

    // 2. Food Recommendations — AI-generated menu suggestions (synced with menu_items)
    await client.query(`
      CREATE TABLE IF NOT EXISTS food_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        recommendation_type VARCHAR(50) NOT NULL,
        recommendation_text TEXT NOT NULL,
        same_day_events JSONB,
        historical_context JSONB,
        cost_savings_estimate NUMERIC(12,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ food_recommendations table created");

    // 3. Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_food_consumption_event ON food_consumption(event_id);
      CREATE INDEX IF NOT EXISTS idx_food_consumption_item ON food_consumption(item_name);
      CREATE INDEX IF NOT EXISTS idx_food_recommendations_event ON food_recommendations(event_id);
    `);
    console.log("✅ Indexes created");

    await client.query("COMMIT");
    console.log("\n🎉 Food Intelligence migration completed!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
