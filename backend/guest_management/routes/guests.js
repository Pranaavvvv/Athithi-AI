/**
 * Guest Routes
 * CRUD operations for guests, status management, QR code generation.
 * All routes require authentication (JWT cookie).
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db");
const qrService = require("../services/qrService");
const rsvpService = require("../services/rsvpService");

/**
 * GET /guests/:eventId
 * List all guests for an event.
 */
router.get("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await pool.query(
      `SELECT id, name, email, phone, status, qr_code, rsvp_token, 
              dietary_preferences, plus_ones, notes, photo_url,
              verified, verified_at,
              rsvp_completed_at, arrived_at, created_at
       FROM gm_guests 
       WHERE event_id = $1 
       ORDER BY created_at DESC`,
      [eventId]
    );
    res.json({ guests: result.rows, count: result.rows.length });
  } catch (err) {
    console.error("Error fetching guests:", err);
    res.status(500).json({ error: "Failed to fetch guests" });
  }
});

/**
 * POST /guests/:eventId
 * Add a new guest to an event.
 * Body: { name, email, phone, plus_ones, notes }
 */
router.post("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, email, phone, plus_ones, notes } = req.body;

    // Verify event exists
    const event = await pool.query("SELECT id, guest_count FROM events WHERE id = $1", [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check guest limit
    const guestCount = await pool.query(
      "SELECT COUNT(*) AS count FROM gm_guests WHERE event_id = $1",
      [eventId]
    );
    if (parseInt(guestCount.rows[0].count, 10) >= event.rows[0].guest_count) {
      return res.status(400).json({ error: "Guest limit reached for this event" });
    }

    const result = await pool.query(
      `INSERT INTO gm_guests (event_id, name, email, phone, plus_ones, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'inquiry')
       RETURNING *`,
      [eventId, name, email, phone, plus_ones || 0, notes]
    );

    res.status(201).json({ guest: result.rows[0] });
  } catch (err) {
    console.error("Error adding guest:", err);
    res.status(500).json({ error: "Failed to add guest" });
  }
});

/**
 * PATCH /guests/:guestId/status
 * Update guest status. Transitions: inquiry → booked → rsvp_sent → rsvp_completed → arrived
 * Body: { status }
 * When transitioning to "booked", auto-generates RSVP token + QR code.
 */
router.patch("/:guestId/status", async (req, res) => {
  try {
    const { guestId } = req.params;
    const { status } = req.body;

    const validStatuses = ["inquiry", "booked", "rsvp_sent", "rsvp_completed", "rsvp_pending_verification", "verified", "arrived", "cancelled", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    // If setting to "booked", generate RSVP token + link (NO QR code — QR comes after verification)
    if (status === "booked") {
      const rsvpToken = uuidv4();
      const RSVP_BASE_URL = process.env.RSVP_BASE_URL || "https://athithiai.vercel.app/public/rsvp";

      await pool.query(
        `UPDATE gm_guests 
         SET status = 'booked', rsvp_token = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [rsvpToken, guestId]
      );

      return res.json({
        message: "Guest booked. RSVP link generated. QR code will be created after guest is verified.",
        guestId,
        rsvpToken,
        rsvpLink: `${RSVP_BASE_URL}/${rsvpToken}`,
      });
    }

    // Normal status update
    await pool.query(
      "UPDATE gm_guests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [status, guestId]
    );

    res.json({ message: `Guest status updated to "${status}"`, guestId });
  } catch (err) {
    console.error("Error updating guest status:", err);
    res.status(500).json({ error: err.message || "Failed to update status" });
  }
});

/**
 * POST /guests/:guestId/qr
 * Generate (or regenerate) QR code for a booked guest.
 */
router.post("/:guestId/qr", async (req, res) => {
  try {
    const result = await qrService.generateQRForGuest(req.params.guestId);
    res.json(result);
  } catch (err) {
    console.error("Error generating QR:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /guests/event/:eventId/generate-all-qr
 * Generate QR codes for all booked guests in an event that don't have one yet.
 */
router.post("/event/:eventId/generate-all-qr", async (req, res) => {
  try {
    const result = await qrService.generateQRForEvent(req.params.eventId);
    res.json(result);
  } catch (err) {
    console.error("Error generating QR codes:", err);
    res.status(500).json({ error: "Failed to generate QR codes" });
  }
});

/**
 * GET /guests/:eventId/pending-verification
 * Client dashboard — lists guests who filled the RSVP form and are awaiting approval.
 */
router.get("/:eventId/pending-verification", async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await pool.query(
      `SELECT id, name, email, phone, status, dietary_preferences, allergy_severity,
              plus_ones, notes, photo_url, rsvp_completed_at, created_at
       FROM gm_guests
       WHERE event_id = $1 AND status = 'rsvp_pending_verification'
       ORDER BY rsvp_completed_at ASC`,
      [eventId]
    );
    res.json({ guests: result.rows, count: result.rows.length });
  } catch (err) {
    console.error("Error fetching pending guests:", err);
    res.status(500).json({ error: "Failed to fetch pending verification list" });
  }
});

/**
 * PATCH /guests/:guestId/verify
 * Client approves or rejects a guest.
 * Body: { action: "approve" | "reject" }
 * On approve: verified=TRUE, status='verified', QR code generated.
 * On reject: status='rejected'.
 */
router.patch("/:guestId/verify", async (req, res) => {
  try {
    const { guestId } = req.params;
    const { action } = req.body;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    // Verify guest exists and is pending
    const guestResult = await pool.query(
      "SELECT id, status, rsvp_token, name FROM gm_guests WHERE id = $1",
      [guestId]
    );

    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: "Guest not found" });
    }

    const guest = guestResult.rows[0];

    if (guest.status !== "rsvp_pending_verification") {
      return res.status(400).json({
        error: `Guest status is "${guest.status}". Only guests with status "rsvp_pending_verification" can be verified.`,
      });
    }

    if (action === "reject") {
      await pool.query(
        `UPDATE gm_guests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [guestId]
      );
      return res.json({ message: `Guest "${guest.name}" rejected.`, guestId, status: "rejected" });
    }

    // Approve: set verified, generate QR code
    await pool.query(
      `UPDATE gm_guests 
       SET status = 'verified', verified = TRUE, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [guestId]
    );

    // Generate QR code now that guest is verified
    const qrResult = await qrService.generateQRForGuest(guestId);

    return res.json({
      message: `Guest "${guest.name}" verified! QR code generated.`,
      guestId,
      status: "verified",
      rsvpLink: qrResult.rsvpUrl,
      qrCode: qrResult.qrCode,
    });
  } catch (err) {
    console.error("Error verifying guest:", err);
    res.status(500).json({ error: err.message || "Failed to verify guest" });
  }
});

module.exports = router;
