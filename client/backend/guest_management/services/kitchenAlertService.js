/**
 * Kitchen Alert Service
 * Persists kitchen alerts to the database and provides alert history.
 */

const pool = require("../config/db");

/**
 * Save a kitchen alert to the database.
 * @param {string} eventId
 * @param {string} alertType - e.g. "threshold_reached", "headcount_update"
 * @param {string} message - human-readable alert message
 * @param {number} headcount - current arrived count when alert was triggered
 * @param {number} expectedTotal - total expected guests
 * @param {number} percentageReached - threshold percentage (e.g. 25, 50, 75)
 */
async function sendKitchenAlert(eventId, alertType, message, headcount, expectedTotal, percentageReached) {
  const result = await pool.query(
    `INSERT INTO gm_kitchen_alerts (event_id, alert_type, message, headcount_at_alert, expected_total, percentage_reached)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [eventId, alertType, message, headcount, expectedTotal, percentageReached]
  );

  console.log(`[KITCHEN ALERT] ${message}`);
  return result.rows[0];
}

/**
 * Get alert history for an event, most recent first.
 */
async function getAlerts(eventId, limit = 50) {
  const result = await pool.query(
    `SELECT * FROM gm_kitchen_alerts
     WHERE event_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [eventId, limit]
  );
  return result.rows;
}

module.exports = {
  sendKitchenAlert,
  getAlerts,
};
