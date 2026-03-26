const pool = require('./guest_management/config/db');

async function check() {
  try {
    const r = await pool.query(
      `SELECT g.status, g.verified, e.verify_entries 
       FROM gm_guests g JOIN events e ON g.event_id = e.id 
       WHERE g.id = 'd33f5380-f3ee-4d72-b50d-b079d3c969e5'`
    );
    console.log("Guest status check:", JSON.stringify(r.rows, null, 2));
  } catch(e) {
    console.error("Error:", e.message);
  }
  pool.end();
}

check();
