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
