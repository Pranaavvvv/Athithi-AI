/**
 * Headcount Service
 * Tracks live arrived vs. expected headcount, detects threshold crossings,
 * records arrivals, and triggers kitchen alerts.
 */

const pool = require("../config/db");
const kitchenAlertService = require("./kitchenAlertService");

const THRESHOLDS = (process.env.KITCHEN_ALERT_THRESHOLDS || "25,50,75,90,100")
  .split(",")
  .map(Number);

/**
 * Get live headcount for an event.
 * expected = guests with status in (rsvp_completed, arrived)
 * arrived = guests with status = arrived
 */
async function getHeadcount(eventId) {
  const expected = await pool.query(
    `SELECT COUNT(*) AS count FROM gm_guests 
     WHERE event_id = $1 AND status IN ('rsvp_completed', 'arrived')`,
    [eventId]
  );

  const arrived = await pool.query(
    `SELECT COUNT(*) AS count FROM gm_guests 
     WHERE event_id = $1 AND status = 'arrived'`,
    [eventId]
  );

  const totalGuests = await pool.query(
    `SELECT COUNT(*) AS count FROM gm_guests WHERE event_id = $1`,
    [eventId]
  );

  const expectedCount = parseInt(expected.rows[0].count, 10);
  const arrivedCount = parseInt(arrived.rows[0].count, 10);
  const totalCount = parseInt(totalGuests.rows[0].count, 10);

  return {
    eventId,
    total: totalCount,
    expected: expectedCount,
    arrived: arrivedCount,
    remaining: expectedCount - arrivedCount,
    percentArrived: expectedCount > 0
      ? Math.round((arrivedCount / expectedCount) * 100)
      : 0,
  };
}

/**
 * Record a guest arrival (QR scan at venue).
 * Marks guest as "arrived", logs in arrival_log, checks thresholds.
 * @param {string} guestId
 * @param {string} eventId
 * @param {string|null} scannedBy - user ID of the person who scanned
 * @param {Function|null} wsBroadcast - callback to broadcast via WebSocket
 * @returns {Object} headcount snapshot after arrival
 */
async function recordArrival(guestId, eventId, scannedBy = null, wsBroadcast = null) {
  // Verify guest exists and belongs to event
  const guest = await pool.query(
    "SELECT id, name, status, allergy_severity, dietary_preferences FROM gm_guests WHERE id = $1 AND event_id = $2",
    [guestId, eventId]
  );

  if (guest.rows.length === 0) {
    throw new Error("Guest not found for this event");
  }

  if (guest.rows[0].status === "arrived") {
    throw new Error("Guest has already been scanned as arrived");
  }

  // Mark as arrived
  await pool.query(
    `UPDATE gm_guests 
     SET status = 'arrived', arrived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [guestId]
  );

  // Log arrival
  await pool.query(
    `INSERT INTO gm_arrival_log (guest_id, event_id, scanned_by) VALUES ($1, $2, $3)`,
    [guestId, eventId, scannedBy]
  );

  // Get updated headcount
  const headcount = await getHeadcount(eventId);

  // Check thresholds and send kitchen alerts
  await checkThresholds(eventId, headcount, wsBroadcast);

  // Broadcast headcount update via WebSocket
  if (wsBroadcast) {
    wsBroadcast(`headcount:${eventId}`, {
      type: "headcount_update",
      guestName: guest.rows[0].name,
      ...headcount,
      timestamp: new Date().toISOString(),
    });

    // Allergy Alert: if the guest has severe allergies, fire a dedicated kitchen alert
    const guestData = guest.rows[0];
    if (guestData.allergy_severity === 'severe') {
      wsBroadcast(`kitchen:${eventId}`, {
        type: "allergy_alert",
        severity: "severe",
        guestName: guestData.name,
        dietaryPreferences: guestData.dietary_preferences,
        message: `⚠️ ALLERGY ALERT: ${guestData.name} has SEVERE allergies (${guestData.dietary_preferences || 'unspecified'}). Immediate kitchen attention required!`,
        timestamp: new Date().toISOString(),
      });
      console.log(`[ALLERGY ALERT] 🚨 Severe allergy guest arrived: ${guestData.name}`);
    }
  }

  return headcount;
}

/**
 * Check if any threshold has been newly crossed and trigger kitchen alerts.
 */
async function checkThresholds(eventId, headcount, wsBroadcast = null) {
  if (headcount.expected === 0) return;

  const currentPercent = headcount.percentArrived;

  // Get previously triggered thresholds from kitchen_alerts
  const existing = await pool.query(
    `SELECT DISTINCT percentage_reached FROM gm_kitchen_alerts 
     WHERE event_id = $1 AND alert_type = 'threshold_reached'`,
    [eventId]
  );

  const triggeredThresholds = existing.rows.map((r) =>
    parseFloat(r.percentage_reached)
  );

  for (const threshold of THRESHOLDS) {
    if (currentPercent >= threshold && !triggeredThresholds.includes(threshold)) {
      const message = `🍽️ ${threshold}% headcount reached! ${headcount.arrived}/${headcount.expected} guests have arrived.`;

      await kitchenAlertService.sendKitchenAlert(
        eventId,
        "threshold_reached",
        message,
        headcount.arrived,
        headcount.expected,
        threshold
      );

      // Broadcast to kitchen WebSocket clients
      if (wsBroadcast) {
        wsBroadcast(`kitchen:${eventId}`, {
          type: "kitchen_alert",
          alertType: "threshold_reached",
          message,
          threshold,
          ...headcount,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}

module.exports = {
  getHeadcount,
  recordArrival,
};
