/**
 * Headcount Routes
 * Live headcount dashboard, QR scan arrival recording, and kitchen alerts.
 * Uses WebSocket for real-time updates.
 */

const express = require("express");
const router = express.Router();
const headcountService = require("../services/headcountService");
const kitchenAlertService = require("../services/kitchenAlertService");
const wsManager = require("../websocket/wsManager");

/**
 * GET /headcount/:eventId
 * Returns live headcount: expected, arrived, remaining, percentArrived.
 */
router.get("/:eventId", async (req, res) => {
  try {
    const headcount = await headcountService.getHeadcount(req.params.eventId);
    res.json(headcount);
  } catch (err) {
    console.error("Error fetching headcount:", err);
    res.status(500).json({ error: "Failed to fetch headcount" });
  }
});

/**
 * POST /headcount/:eventId/scan
 * Record a guest arrival by QR scan.
 * Body: { guestId, scannedBy? }
 * Broadcasts headcount update + kitchen alerts via WebSocket.
 */
router.post("/:eventId/scan", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestId, scannedBy } = req.body;

    if (!guestId) {
      return res.status(400).json({ error: "guestId is required" });
    }

    const headcount = await headcountService.recordArrival(
      guestId,
      eventId,
      scannedBy || null,
      wsManager.getBroadcaster()
    );

    res.json({
      message: "Arrival recorded",
      ...headcount,
    });
  } catch (err) {
    console.error("Error recording arrival:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /headcount/:eventId/scan-token
 * Record a guest arrival by QR token scan.
 * Body: { token } — the rsvp_token extracted from the QR code.
 * Resolves the guest server-side so the frontend doesn't need a local guest list match.
 */
router.post("/:eventId/scan-token", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    // Resolve guest by rsvp_token
    const pool = require("../config/db");
    const guestResult = await pool.query(
      "SELECT id, name, status, email, phone, plus_ones, allergy_severity, dietary_preferences FROM gm_guests WHERE rsvp_token = $1 AND event_id = $2",
      [token, eventId]
    );

    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: "No guest found with this QR code for this event" });
    }

    const guest = guestResult.rows[0];

    if (guest.status === "arrived") {
      return res.status(409).json({
        error: "Guest has already checked in",
        guest: { id: guest.id, name: guest.name, status: "arrived" },
      });
    }

    const headcount = await headcountService.recordArrival(
      guest.id,
      eventId,
      null,
      wsManager.getBroadcaster()
    );

    res.json({
      message: "Arrival recorded",
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        plus_ones: guest.plus_ones,
        allergy_severity: guest.allergy_severity,
        dietary_preferences: guest.dietary_preferences,
        status: "arrived",
      },
      ...headcount,
    });
  } catch (err) {
    console.error("Error recording arrival by token:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /headcount/:eventId/alerts
 * Get kitchen alert history for an event.
 */
router.get("/:eventId/alerts", async (req, res) => {
  try {
    const alerts = await kitchenAlertService.getAlerts(req.params.eventId);
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

module.exports = router;
