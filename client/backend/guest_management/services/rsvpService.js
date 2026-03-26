/**
 * RSVP Service
 * Handles RSVP link generation, form submission with photo upload, and retrieval.
 */

const { v4: uuidv4 } = require("uuid");
const path = require("path");
const pool = require("../config/db");

const RSVP_BASE_URL = process.env.RSVP_BASE_URL || "http://localhost:5556/rsvp";

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
    `SELECT g.id, g.name, g.email, g.phone, g.status, g.dietary_preferences, g.allergy_severity, g.plus_ones, g.notes, g.qr_code,
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
    "SELECT id, status FROM gm_guests WHERE rsvp_token = $1",
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

  updateFields.push(`status = 'rsvp_completed'`);
  updateFields.push(`rsvp_completed_at = CURRENT_TIMESTAMP`);
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

  updateValues.push(rsvpToken);

  await pool.query(
    `UPDATE gm_guests SET ${updateFields.join(", ")} WHERE rsvp_token = $${paramIndex}`,
    updateValues
  );

  return { success: true, guestId: guest.id };
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

module.exports = {
  generateRSVPLink,
  getRSVPByToken,
  submitRSVP,
  getRSVPsByEvent,
};
