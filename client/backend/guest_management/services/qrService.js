/**
 * QR Code Service
 * Generates QR codes for guests with status "booked".
 * QR data encodes the guest's RSVP link URL.
 */

const QRCode = require("qrcode");
const pool = require("../config/db");

const RSVP_BASE_URL = process.env.RSVP_BASE_URL || "http://localhost:5556/rsvp";

/**
 * Generate a QR code for a booked guest.
 * The QR encodes the RSVP URL: {RSVP_BASE_URL}/{rsvp_token}
 */
async function generateQRForGuest(guestId) {
  const result = await pool.query(
    "SELECT id, status, rsvp_token FROM gm_guests WHERE id = $1",
    [guestId]
  );

  if (result.rows.length === 0) {
    throw new Error("Guest not found");
  }

  const guest = result.rows[0];

  if (guest.status !== "booked") {
    throw new Error(`Guest status is "${guest.status}", must be "booked" to generate QR`);
  }

  if (!guest.rsvp_token) {
    throw new Error("Guest has no RSVP token. Generate RSVP link first.");
  }

  const rsvpUrl = `${RSVP_BASE_URL}/${guest.rsvp_token}`;

  // Generate QR code as base64 data URL
  const qrDataUrl = await QRCode.toDataURL(rsvpUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });

  // Store in database
  await pool.query(
    "UPDATE gm_guests SET qr_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [qrDataUrl, guestId]
  );

  return { guestId, rsvpUrl, qrCode: qrDataUrl };
}

/**
 * Generate QR codes for ALL booked guests in an event.
 * Returns summary of generated vs skipped.
 */
async function generateQRForEvent(eventId) {
  const guests = await pool.query(
    "SELECT id, status, rsvp_token FROM gm_guests WHERE event_id = $1 AND status = 'booked' AND rsvp_token IS NOT NULL",
    [eventId]
  );

  const results = { generated: 0, skipped: 0, errors: [] };

  for (const guest of guests.rows) {
    try {
      await generateQRForGuest(guest.id);
      results.generated++;
    } catch (err) {
      results.skipped++;
      results.errors.push({ guestId: guest.id, error: err.message });
    }
  }

  return results;
}

module.exports = {
  generateQRForGuest,
  generateQRForEvent,
};
