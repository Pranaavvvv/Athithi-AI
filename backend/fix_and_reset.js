const pool = require('./guest_management/config/db');

async function fix() {
  try {
    // Fix the event's verify_entries flag
    await pool.query(
      "UPDATE events SET verify_entries = TRUE WHERE id = 'ad5da87a-78a2-41bc-9dfe-aa0b1b461ebe'"
    );
    console.log("✅ Fixed event verify_entries = TRUE");

    // Reset guest status back to "booked" so we can re-submit RSVP
    await pool.query(
      `UPDATE gm_guests SET status = 'booked', rsvp_completed_at = NULL, dietary_preferences = NULL, allergy_severity = 'none', notes = 'Family friend' WHERE id = 'd33f5380-f3ee-4d72-b50d-b079d3c969e5'`
    );
    console.log("✅ Reset guest status to 'booked'");

    // Verify
    const r = await pool.query(
      `SELECT g.status, g.verified, e.verify_entries 
       FROM gm_guests g JOIN events e ON g.event_id = e.id 
       WHERE g.id = 'd33f5380-f3ee-4d72-b50d-b079d3c969e5'`
    );
    console.log("Current state:", JSON.stringify(r.rows[0]));
  } catch(e) {
    console.error("Error:", e.message);
  }
  pool.end();
}

fix();
