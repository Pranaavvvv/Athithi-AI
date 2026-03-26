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
      party_name VARCHAR(255),
      event_type VARCHAR(100),
      date VARCHAR(20),
      time_slot VARCHAR(50),
      guest_count VARCHAR(50),
      gst_number VARCHAR(15),
      package VARCHAR(100),
      status VARCHAR(50) NOT NULL DEFAULT 'TEMPORARY_ENQUIRY',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
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
