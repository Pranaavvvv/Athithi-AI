/**
 * Kitchen Food Requests — Database Migration
 * Creates kitchen_requests table for crowdsourced guest food/beverage requests.
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

    // Live Guest Food/Beverage Requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS kitchen_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        requested_by VARCHAR(255) DEFAULT 'Anonymous',
        upvotes INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending', -- pending, preparing, served, rejected
        served_at TIMESTAMPTZ,
        requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ kitchen_requests table created");

    // Indexes for fast querying
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kitchen_requests_event ON kitchen_requests(event_id);
      CREATE INDEX IF NOT EXISTS idx_kitchen_requests_status ON kitchen_requests(status);
      CREATE INDEX IF NOT EXISTS idx_kitchen_requests_upvotes ON kitchen_requests(upvotes);
    `);
    console.log("✅ Indexes created");

    await client.query("COMMIT");
    console.log("\n🎉 Kitchen Requests migration completed!");
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
