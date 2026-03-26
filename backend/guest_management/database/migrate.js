/**
 * Guest Management — Database Migration (MERGED ARCHITECTURE)
 * Creates all tables needed for guest management, RSVP, headcount, and kitchen alerts.
 * Uses pgvector for face embeddings.
 * Maps all guest features directly to the central `events` table.
 */

const pool = require("../config/db");

const migrate = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Enable pgvector extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("✅ pgvector extension enabled");

    // 2. Enable uuid-ossp for fallback UUID generation
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log("✅ uuid-ossp extension enabled");

    // 3. Central Events Modification (Add event_token to existing table)
    // The events table is managed by Python, but we need a unique URL-safe token.
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_token VARCHAR(100) UNIQUE;`);
    console.log("✅ Central 'events' table altered with event_token");

    // 4. Guests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gm_guests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'inquiry',
        qr_code TEXT,
        rsvp_token VARCHAR(100) UNIQUE,
        dietary_preferences TEXT,
        plus_ones INTEGER DEFAULT 0,
        notes TEXT,
        photo_url TEXT,
        embedding vector(512),
        rsvp_completed_at TIMESTAMPTZ,
        arrived_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ gm_guests table created linked to central expected events");

    // 5. Arrival log
    await client.query(`
      CREATE TABLE IF NOT EXISTS gm_arrival_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        guest_id UUID REFERENCES gm_guests(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        scanned_by UUID
      );
    `);
    console.log("✅ gm_arrival_log table created");

    // 6. Kitchen alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS gm_kitchen_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        headcount_at_alert INTEGER,
        expected_total INTEGER,
        percentage_reached NUMERIC(5,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ gm_kitchen_alerts table created");

    // 7. Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gm_guests_event_id ON gm_guests(event_id);
      CREATE INDEX IF NOT EXISTS idx_gm_guests_status ON gm_guests(status);
      CREATE INDEX IF NOT EXISTS idx_gm_guests_rsvp_token ON gm_guests(rsvp_token);
      CREATE INDEX IF NOT EXISTS idx_gm_guests_email ON gm_guests(email);
      CREATE INDEX IF NOT EXISTS idx_gm_arrival_event_id ON gm_arrival_log(event_id);
      CREATE INDEX IF NOT EXISTS idx_gm_arrival_guest_id ON gm_arrival_log(guest_id);
      CREATE INDEX IF NOT EXISTS idx_gm_kitchen_event_id ON gm_kitchen_alerts(event_id);
    `);
    console.log("✅ Indexes created");

    // 8. Guest Verification columns
    await client.query(`
      ALTER TABLE gm_guests ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE gm_guests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_gm_guests_verified ON gm_guests(verified);
    `);
    console.log("✅ gm_guests verification columns added");

    // 9. Event-level verify_entries toggle
    await client.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS verify_entries BOOLEAN DEFAULT TRUE;
      ALTER TABLE events ALTER COLUMN verify_entries SET DEFAULT TRUE;
      UPDATE events SET verify_entries = TRUE WHERE verify_entries IS NULL;
    `);
    console.log("✅ events.verify_entries column added/fixed");

    // 10. Face matches table (event photos matched against guest embeddings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS face_matches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        guest_id UUID REFERENCES gm_guests(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        similarity DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_face_matches_event ON face_matches(event_id);
      CREATE INDEX IF NOT EXISTS idx_face_matches_guest ON face_matches(guest_id);
    `);
    console.log("✅ face_matches table created");

    await client.query("COMMIT");
    console.log("\\n🎉 Constructive Migration completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
