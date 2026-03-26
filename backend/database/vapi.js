/**
 * VAPI Voice Sessions — Database Migration
 * Creates the voice_sessions table to store call transcripts, summaries, and recording URLs.
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_sessions (
        call_id VARCHAR(100) PRIMARY KEY,
        phone_number VARCHAR(20),
        summary TEXT,
        transcript TEXT,
        recording_url TEXT,
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ voice_sessions table created");

    await client.query("COMMIT");
    console.log("\n🎉 VAPI Migration completed!");
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
