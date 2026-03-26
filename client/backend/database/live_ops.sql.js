/**
 * Live Ops — Database Migration
 * Creates dj_requests, kitchen_milestones tables and adds allergy_severity to gm_guests.
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

    // 1. Add allergy_severity to gm_guests (none, mild, severe)
    await client.query(`
      ALTER TABLE gm_guests ADD COLUMN IF NOT EXISTS allergy_severity VARCHAR(20) DEFAULT 'none';
    `);
    console.log("✅ Added allergy_severity column to gm_guests");

    // 2. DJ Requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dj_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        song_name VARCHAR(255) NOT NULL,
        artist_name VARCHAR(255),
        requested_by VARCHAR(255),
        upvotes INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'played', 'rejected')),
        played_at TIMESTAMPTZ,
        requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ dj_requests table created");

    // 3. Kitchen Milestones table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kitchen_milestones (
        id SERIAL PRIMARY KEY,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        course_name VARCHAR(100) NOT NULL,
        target_start_time TIMESTAMPTZ,
        actual_start_time TIMESTAMPTZ,
        staff_notified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ kitchen_milestones table created");

    // 4. Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dj_requests_event ON dj_requests(event_id);
      CREATE INDEX IF NOT EXISTS idx_dj_requests_status ON dj_requests(status);
      CREATE INDEX IF NOT EXISTS idx_dj_requests_upvotes ON dj_requests(event_id, upvotes DESC);
      CREATE INDEX IF NOT EXISTS idx_kitchen_milestones_event ON kitchen_milestones(event_id);
      CREATE INDEX IF NOT EXISTS idx_gm_guests_allergy ON gm_guests(event_id, allergy_severity);
    `);
    console.log("✅ Indexes created");

    await client.query("COMMIT");
    console.log("\n🎉 Live Ops migration completed successfully!");
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
