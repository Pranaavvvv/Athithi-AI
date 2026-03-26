/**
 * RSVP Service
 * Handles RSVP link generation, form submission with photo upload, and retrieval.
 */

const { v4: uuidv4 } = require("uuid");
const path = require("path");
const pool = require("../config/db");

const RSVP_BASE_URL = process.env.RSVP_BASE_URL || "https://athithiai.vercel.app/public/rsvp";

/**
 * Generate an RSVP token and link for a guest.
 * Updates the guest record with the rsvp_token and sets status to "rsvp_sent".
 */
async function generateRSVPLink(guestId) {
  const guest = await pool.query("SELECT id, status FROM gm_guests WHERE id = $1", [guestId]);

  if (guest.rows.length === 0) {
    throw new Error("Guest not found");
  }

  if (!["booked", "rsvp_sent"].includes(guest.rows[0].status)) {
    throw new Error(`Guest status is "${guest.rows[0].status}", must be "booked" to generate RSVP link`);
  }

  const rsvpToken = uuidv4();

  await pool.query(
    `UPDATE gm_guests 
     SET rsvp_token = $1, status = 'rsvp_sent', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [rsvpToken, guestId]
  );

  return {
    guestId,
    rsvpToken,
    rsvpLink: `${RSVP_BASE_URL}/${rsvpToken}`,
  };
}

/**
 * Get RSVP form data by token (public — used by the guest to see event info).
 */
async function getRSVPByToken(rsvpToken) {
  const result = await pool.query(
    `SELECT g.id, g.name, g.email, g.phone, g.status, g.dietary_preferences, g.allergy_severity, g.plus_ones, g.notes, g.qr_code, g.verified,
            e.party_name AS event_name, e.event_date, e.location AS venue, e.id AS event_id
     FROM gm_guests g
     JOIN events e ON g.event_id = e.id
     WHERE g.rsvp_token = $1`,
    [rsvpToken]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Submit RSVP details and photo.
 * @param {string} rsvpToken
 * @param {Object} details - { name, email, phone, dietary_preferences, plus_ones, notes }
 * @param {string|null} photoFilename - filename of uploaded photo (from multer)
 */
async function submitRSVP(rsvpToken, details, photoFilename = null) {
  const existing = await pool.query(
    `SELECT g.id, g.status, g.event_id, COALESCE(e.verify_entries, TRUE) AS verify_entries
     FROM gm_guests g
     JOIN events e ON g.event_id = e.id
     WHERE g.rsvp_token = $1`,
    [rsvpToken]
  );

  if (existing.rows.length === 0) {
    throw new Error("Invalid RSVP token");
  }

  const guest = existing.rows[0];

  if (guest.status === "arrived") {
    throw new Error("Guest has already arrived, RSVP cannot be modified");
  }

  const photoUrl = photoFilename
    ? `/uploads/${photoFilename}`
    : null;

  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  const fieldMap = {
    name: details.name,
    email: details.email,
    phone: details.phone,
    dietary_preferences: details.dietary_preferences,
    allergy_severity: details.allergy_severity,
    plus_ones: details.plus_ones != null ? parseInt(details.plus_ones, 10) : undefined,
    notes: details.notes,
  };

  for (const [field, value] of Object.entries(fieldMap)) {
    if (value !== undefined && value !== null) {
      updateFields.push(`${field} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    }
  }

  if (photoUrl) {
    updateFields.push(`photo_url = $${paramIndex}`);
    updateValues.push(photoUrl);
    paramIndex++;
  }

  // If event has verify_entries enabled → rsvp_pending_verification, else → rsvp_completed
  const newStatus = guest.verify_entries ? "rsvp_pending_verification" : "rsvp_completed";
  updateFields.push(`status = '${newStatus}'`);
  updateFields.push(`rsvp_completed_at = CURRENT_TIMESTAMP`);
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

  updateValues.push(rsvpToken);

  await pool.query(
    `UPDATE gm_guests SET ${updateFields.join(", ")} WHERE rsvp_token = $${paramIndex}`,
    updateValues
  );

  return { success: true, guestId: guest.id, status: newStatus };
}

/**
 * Get all RSVPs for an event.
 */
async function getRSVPsByEvent(eventId) {
  const result = await pool.query(
    `SELECT id, name, email, phone, status, dietary_preferences, plus_ones, notes,
            photo_url, rsvp_completed_at, arrived_at
     FROM gm_guests
     WHERE event_id = $1
     ORDER BY rsvp_completed_at DESC NULLS LAST`,
    [eventId]
  );
  return result.rows;
}

/**
 * Join an event publicly via Master RSVP Link (eventToken)
 */
async function joinPublicEvent(eventToken, details, photoFilename = null) {
  // 1. Find event
  const eventRes = await pool.query(
    "SELECT id, guest_count FROM events WHERE event_token = $1",
    [eventToken]
  );
  if (eventRes.rows.length === 0) {
    throw new Error("Invalid event token");
  }
  const event = eventRes.rows[0];

  // 2. Check limits
  const guestCountRes = await pool.query(
    "SELECT COUNT(*) AS count FROM gm_guests WHERE event_id = $1",
    [event.id]
  );
  if (parseInt(guestCountRes.rows[0].count, 10) >= event.guest_count) {
    throw new Error("Guest limit reached for this event");
  }

  // 3. Insert new guest directly as 'rsvp_completed'
  const rsvpToken = uuidv4();
  const photoUrl = photoFilename ? `/uploads/${photoFilename}` : null;
  
  const insertQuery = `
    INSERT INTO gm_guests 
      (event_id, name, email, phone, status, rsvp_token, dietary_preferences, allergy_severity, plus_ones, notes, photo_url, rsvp_completed_at)
    VALUES 
      ($1, $2, $3, $4, 'rsvp_completed', $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    RETURNING id
  `;
  const values = [
    event.id,
    details.name,
    details.email,
    details.phone,
    rsvpToken,
    details.dietary_preferences,
    details.allergy_severity,
    details.plus_ones != null ? parseInt(details.plus_ones, 10) : 0,
    details.notes,
    photoUrl
  ];

  const insertRes = await pool.query(insertQuery, values);
  return { guestId: insertRes.rows[0].id, rsvpToken };
}

module.exports = {
  generateRSVPLink,
  getRSVPByToken,
  submitRSVP,
  getRSVPsByEvent,
  joinPublicEvent,
};
