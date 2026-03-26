/**
 * RSVP Routes
 * Public routes for RSVP form (no auth required).
 * Authenticated routes for viewing RSVPs per event.
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const rsvpService = require("../services/rsvpService");
const embeddingService = require("../services/embeddingService");
const qrService = require("../services/qrService");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

/**
 * GET /rsvp/:rsvpToken
 * Public — returns event + guest info for the RSVP form.
 */
router.get("/:rsvpToken", async (req, res) => {
  try {
    const data = await rsvpService.getRSVPByToken(req.params.rsvpToken);
    if (!data) {
      return res.status(404).json({ error: "Invalid or expired RSVP link" });
    }
    res.json({
      event: {
        id: data.event_id,
        name: data.event_name,
        date: data.event_date,
        venue: data.venue,
      },
      guest: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        verified: data.verified,
        dietaryPreferences: data.dietary_preferences,
        plusOnes: data.plus_ones,
        notes: data.notes,
        qrCode: data.qr_code,
      },
    });
  } catch (err) {
    console.error("Error fetching RSVP:", err);
    res.status(500).json({ error: "Failed to fetch RSVP data" });
  }
});

/**
 * POST /rsvp/:rsvpToken
 * Public — submit RSVP with details and optional photo.
 * Body (multipart): name, email, phone, dietary_preferences, plus_ones, notes, photo (file)
 */
router.post("/:rsvpToken", upload.single("photo"), async (req, res) => {
  try {
    const { rsvpToken } = req.params;
    const photoFilename = req.file ? req.file.filename : null;

    const result = await rsvpService.submitRSVP(rsvpToken, req.body, photoFilename);

    // If photo was uploaded, try to generate face embedding (non-blocking)
    if (req.file) {
      const photoPath = path.join(__dirname, "..", "uploads", req.file.filename);
      embeddingService.processGuestPhoto(result.guestId, photoPath).catch((err) => {
        console.warn(`[EMBEDDING] Failed for guest ${result.guestId}:`, err.message);
      });
    }

    res.json({
      message: "RSVP submitted successfully!",
      guestId: result.guestId,
      status: result.status,
    });
  } catch (err) {
    console.error("Error submitting RSVP:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /rsvp/join/:eventToken
 * Public — fetch event details for the guest signup page.
 */
router.get("/join/:eventToken", async (req, res) => {
  try {
    const { eventToken } = req.params;
    const pool = require("../config/db");
    
    const result = await pool.query(
      "SELECT id, party_name AS name, event_date AS date, location AS venue, guest_count FROM events WHERE event_token = $1",
      [eventToken]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found or link expired" });
    }

    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error("Error fetching event for RSVP:", err);
    res.status(500).json({ error: "Failed to fetch event details" });
  }
});

/**
 * POST /rsvp/join/:eventToken
 * Public — guest uses MASTER link to join an event explicitly.
 * Body (multipart): name, email, phone, dietary_preferences, plus_ones, notes, photo (file)
 */
router.post("/join/:eventToken", upload.single("photo"), async (req, res) => {
  try {
    const { eventToken } = req.params;
    const photoFilename = req.file ? req.file.filename : null;

    const result = await rsvpService.joinPublicEvent(eventToken, req.body, photoFilename);

    // Auto-generate QR code since they are officially booked/rsvp_completed
    const qrResult = await qrService.generateQRForGuest(result.guestId);

    // If photo was uploaded, try to generate face embedding (non-blocking)
    if (req.file) {
      const photoPath = path.join(__dirname, "..", "uploads", req.file.filename);
      embeddingService.processGuestPhoto(result.guestId, photoPath).catch((err) => {
        console.warn(`[EMBEDDING] Failed for guest ${result.guestId}:`, err.message);
      });
    }

    res.json({
      message: "Successfully joined event and created RSVP!",
      guestId: result.guestId,
      rsvpToken: result.rsvpToken,
      qrCode: qrResult.qrCode,
    });
  } catch (err) {
    console.error("Error joining event:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /rsvp/event/:eventId
 * Authenticated — list all RSVPs for an event.
 */
router.get("/event/:eventId", async (req, res) => {
  try {
    const rsvps = await rsvpService.getRSVPsByEvent(req.params.eventId);
    res.json({ rsvps, count: rsvps.length });
  } catch (err) {
    console.error("Error fetching RSVPs:", err);
    res.status(500).json({ error: "Failed to fetch RSVPs" });
  }
});

module.exports = router;
