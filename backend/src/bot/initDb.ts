import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      phone VARCHAR(20) PRIMARY KEY,
      state VARCHAR(50) NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price_per_plate INTEGER NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      event_name VARCHAR(255),
      occasion_type VARCHAR(100),
      client_name VARCHAR(255),
      client_phone VARCHAR(20),
      guest_count INTEGER,
      event_date VARCHAR(20),
      event_time_slot VARCHAR(50),
      gst_number VARCHAR(50),
      package VARCHAR(100),
      estimated_cost INTEGER,
      venue_id VARCHAR(100),
      venue_name VARCHAR(255),
      menu_type VARCHAR(50),
      menu_items TEXT,
      decoration_id VARCHAR(100),
      decoration_name VARCHAR(255),
      installment_plan VARCHAR(50),
      payment_schedule JSONB,
      status VARCHAR(50) NOT NULL DEFAULT 'ENQUIRED',
      booking_id VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Add columns in case the table already exists (migration support)
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS occasion_type VARCHAR(100);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS event_date VARCHAR(20);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS event_time_slot VARCHAR(50);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS estimated_cost INTEGER;
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS venue_id VARCHAR(100);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS menu_type VARCHAR(50);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS menu_items TEXT;
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS decoration_id VARCHAR(100);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS decoration_name VARCHAR(255);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS payment_schedule JSONB;
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS booking_id VARCHAR(100);
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
    
    -- Update old column names if they exist
    DO $$ 
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enquiries' AND column_name='party_name') THEN
        UPDATE enquiries SET event_name = party_name WHERE event_name IS NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enquiries' AND column_name='event_type') THEN
        UPDATE enquiries SET occasion_type = event_type WHERE occasion_type IS NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enquiries' AND column_name='date') THEN
        UPDATE enquiries SET event_date = date WHERE event_date IS NULL;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enquiries' AND column_name='time_slot') THEN
        UPDATE enquiries SET event_time_slot = time_slot WHERE event_time_slot IS NULL;
      END IF;
    END $$;
  `);
  console.log('Database tables initialized successfully.');

  // Check if packages are empty and insert defaults
  const packages = await pool.query('SELECT COUNT(*) FROM packages');
  if (parseInt(packages.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO packages (name, price_per_plate, description) VALUES
      ('Standard', 1500, 'A great entry-level experience with basic decor and catering.'),
      ('Premium', 2500, 'Upgraded catering menus and premium thematic decor.'),
      ('Elite', 4000, 'Luxury 5-star experience with extravagant decor.'),
      ('Personalized', 0, 'Custom tailored event suited to unique needs.')
    `);
    console.log('Default packages inserted successfully.');
  }

  process.exit(0);
}

init().catch((err) => {
  console.error('Error creating database tables:', err);
  process.exit(1);
});
