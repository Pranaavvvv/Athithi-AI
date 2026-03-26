/**
 * WhatsApp AI Sessions — Database Migration
 * Creates the whatsapp_sessions table for the IntelliManager state machine.
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
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        phone_number VARCHAR(20) PRIMARY KEY,
        state VARCHAR(50) DEFAULT 'GREETING',
        status VARCHAR(20) DEFAULT 'ENQUIRED',
        session_data JSONB DEFAULT '{}'::jsonb,
        last_interaction TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ whatsapp_sessions table created");

    await client.query("COMMIT");
    console.log("\n🎉 WhatsApp migration completed!");
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
