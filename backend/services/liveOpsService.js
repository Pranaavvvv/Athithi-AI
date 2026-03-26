/**
 * Live Ops Service
 * Business logic for DJ song requests (with dedup/upvote), kitchen milestones,
 * and allergy alert broadcasting.
 */

const pool = require("../guest_management/config/db");
const { normalizeSong } = require("./featherless");


// ─── DJ: Song Requests ────────────────────────────────────────

/**
 * Request a song or upvote an existing one.
 * If the exact song+artist combo already exists for this event (case-insensitive),
 * increment upvotes instead of inserting a duplicate.
 */
async function requestSong(eventId, songName, artistName, requestedBy) {
  // ── Step 1: LLM Normalization ───────────────────────────────
  // Fixes typos/spelling variations so "chamaaak chalo" === "Chamak Chalo"
  const normalized = await normalizeSong(songName, artistName || null);
  const normalizedSong = normalized.song_name;
  const normalizedArtist = normalized.artist_name || "";

  // ── Step 2: One song per requester (per event) ──────────────
  // Each unique link (requestedBy) can only request one song per event.
  if (requestedBy && requestedBy !== "Anonymous") {
    const alreadyRequested = await pool.query(
      `SELECT id, song_name FROM dj_requests
       WHERE event_id = $1 AND requested_by = $2 AND status NOT IN ('rejected')`,
      [eventId, requestedBy]
    );
    if (alreadyRequested.rows.length > 0) {
      const prev = alreadyRequested.rows[0];
      return {
        action: "already_requested",
        request: prev,
        message: `You've already requested "${prev.song_name}" for this event. Each guest can request only one song! 🎵`
      };
    }
  }

  // ── Step 3: Dedup check using normalized name ───────────────
  const existing = await pool.query(
    `SELECT id, upvotes FROM dj_requests
     WHERE event_id = $1 AND LOWER(song_name) = LOWER($2) AND LOWER(COALESCE(artist_name,'')) = LOWER(COALESCE($3,''))
     AND status IN ('pending', 'playing')`,
    [eventId, normalizedSong, normalizedArtist]
  );

  if (existing.rows.length > 0) {
    // Upvote existing request
    const updated = await pool.query(
      `UPDATE dj_requests SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *`,
      [existing.rows[0].id]
    );
    return { action: "upvoted", request: updated.rows[0], normalized_song: normalizedSong };
  }

  // ── Step 4: Insert new request with normalized name ─────────
  const result = await pool.query(
    `INSERT INTO dj_requests (event_id, song_name, artist_name, requested_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [eventId, normalizedSong, normalizedArtist || null, requestedBy || "Anonymous"]
  );

  return { action: "created", request: result.rows[0], normalized_song: normalizedSong };
}

/**
 * Upvote an existing song request by ID.
 */
async function upvoteSong(requestId) {
  const result = await pool.query(
    `UPDATE dj_requests SET upvotes = upvotes + 1 WHERE id = $1 AND status IN ('pending', 'playing') RETURNING *`,
    [requestId]
  );
  if (result.rows.length === 0) throw new Error("Request not found or already played/rejected");
  return result.rows[0];
}

/**
 * Get the DJ leaderboard for an event (sorted by upvotes desc).
 */
async function getLeaderboard(eventId) {
  const result = await pool.query(
    `SELECT id, song_name, artist_name, requested_by, upvotes, status, requested_at
     FROM dj_requests
     WHERE event_id = $1
     ORDER BY 
       CASE status WHEN 'playing' THEN 0 WHEN 'pending' THEN 1 WHEN 'played' THEN 2 ELSE 3 END,
       upvotes DESC,
       requested_at ASC`,
    [eventId]
  );
  return result.rows;
}

/**
 * Mark a song as played by the DJ.
 */
async function markPlayed(requestId) {
  const result = await pool.query(
    `UPDATE dj_requests SET status = 'played', played_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [requestId]
  );
  if (result.rows.length === 0) throw new Error("Request not found");
  return result.rows[0];
}

/**
 * Mark a song as currently playing.
 */
async function markPlaying(requestId) {
  const result = await pool.query(
    `UPDATE dj_requests SET status = 'playing' WHERE id = $1 RETURNING *`,
    [requestId]
  );
  if (result.rows.length === 0) throw new Error("Request not found");
  return result.rows[0];
}

/**
 * Reject a song request.
 */
async function rejectSong(requestId) {
  const result = await pool.query(
    `UPDATE dj_requests SET status = 'rejected' WHERE id = $1 RETURNING *`,
    [requestId]
  );
  if (result.rows.length === 0) throw new Error("Request not found");
  return result.rows[0];
}

// ─── Kitchen: Milestones ──────────────────────────────────────

/**
 * Get all milestones for an event.
 */
async function getKitchenMilestones(eventId) {
  const result = await pool.query(
    `SELECT * FROM kitchen_milestones WHERE event_id = $1 ORDER BY target_start_time ASC NULLS LAST`,
    [eventId]
  );
  return result.rows;
}

/**
 * Create or update a kitchen milestone (course timing).
 */
async function upsertMilestone(eventId, courseName, targetStartTime) {
  const result = await pool.query(
    `INSERT INTO kitchen_milestones (event_id, course_name, target_start_time)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, course_name) DO NOTHING
     RETURNING *`,
    [eventId, courseName, targetStartTime || null]
  );

  // If conflict (already exists), just fetch it
  if (result.rows.length === 0) {
    const existing = await pool.query(
      `SELECT * FROM kitchen_milestones WHERE event_id = $1 AND course_name = $2`,
      [eventId, courseName]
    );
    return existing.rows[0];
  }

  return result.rows[0];
}

/**
 * Mark a course as started (actual_start_time = now).
 */
async function startCourse(milestoneId) {
  const result = await pool.query(
    `UPDATE kitchen_milestones SET actual_start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [milestoneId]
  );
  if (result.rows.length === 0) throw new Error("Milestone not found");
  return result.rows[0];
}

/**
 * Mark staff as notified for a course.
 */
async function notifyStaff(milestoneId) {
  const result = await pool.query(
    `UPDATE kitchen_milestones SET staff_notified = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [milestoneId]
  );
  if (result.rows.length === 0) throw new Error("Milestone not found");
  return result.rows[0];
}

// ─── Allergy: Check on Arrival ────────────────────────────────

/**
 * Check if an arriving guest has allergy flags. Returns the guest data if severe.
 */
async function checkAllergyOnArrival(guestId) {
  const result = await pool.query(
    `SELECT id, name, allergy_severity, dietary_preferences FROM gm_guests WHERE id = $1`,
    [guestId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// ==========================================
// 🍽️ LIVE KITCHEN FOOD REQUESTS
// ==========================================

/**
 * Submit a food/beverage request.
 * Deduplication: If the exact item name exists (case-insensitive) for this event,
 * it just increments upvotes instead of creating a duplicate row.
 */
async function submitFoodRequest(eventId, itemName, requestedBy = "Anonymous") {
  // 1. Check for existing request
  const existing = await pool.query(
    `SELECT id, upvotes, status FROM kitchen_requests 
     WHERE event_id = $1 AND LOWER(item_name) = LOWER($2) AND status IN ('pending', 'preparing')`,
    [eventId, itemName]
  );

  if (existing.rows.length > 0) {
    // 2. Auto-Upvote instead
    const reqItem = existing.rows[0];
    const upvoted = await pool.query(
      `UPDATE kitchen_requests 
       SET upvotes = upvotes + 1 
       WHERE id = $1 RETURNING *`,
      [reqItem.id]
    );
    
    // Using require here to avoid circular dependencies if any
    const wsManager = require("../guest_management/websocket/wsManager");
    wsManager.broadcast(`kitchen:${eventId}`, {
      type: "food_leaderboard_update",
      action: "upvoted",
      request: upvoted.rows[0],
      timestamp: new Date()
    });

    return { action: "upvoted", request: upvoted.rows[0] };
  }

  // 3. Insert new request
  const newReq = await pool.query(
    `INSERT INTO kitchen_requests (event_id, item_name, requested_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [eventId, itemName, requestedBy]
  );

  const wsManager = require("../guest_management/websocket/wsManager");
  wsManager.broadcast(`kitchen:${eventId}`, {
    type: "food_leaderboard_update",
    action: "created",
    request: newReq.rows[0],
    timestamp: new Date()
  });

  return { action: "created", request: newReq.rows[0] };
}

/**
 * Explicitly upvote an existing food request by its ID.
 */
async function upvoteFoodRequest(requestId) {
  const result = await pool.query(
    `UPDATE kitchen_requests SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *`,
    [requestId]
  );
  if (result.rows.length === 0) throw new Error("Request not found");
  
  const wsManager = require("../guest_management/websocket/wsManager");
  wsManager.broadcast(`kitchen:${result.rows[0].event_id}`, {
    type: "food_leaderboard_update",
    action: "upvoted",
    request: result.rows[0],
    timestamp: new Date()
  });

  return result.rows[0];
}

/**
 * Get the live food request leaderboard for guests and kitchen dashboard.
 * Sorted by preparing -> pending, then by upvotes descending.
 */
async function getFoodLeaderboard(eventId) {
  const result = await pool.query(
    `SELECT id, item_name, requested_by, upvotes, status, requested_at
     FROM kitchen_requests
     WHERE event_id = $1 AND status != 'rejected' AND status != 'served'
     ORDER BY 
        CASE status 
            WHEN 'preparing' THEN 1 
            WHEN 'pending' THEN 2 
        END,
        upvotes DESC,
        requested_at ASC`,
    [eventId]
  );
  return result.rows;
}

/**
 * Kitchen updates the status of a request (preparing, served, rejected).
 */
async function updateFoodRequestStatus(requestId, status) {
  const validStatuses = ['pending', 'preparing', 'served', 'rejected'];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  const query = status === 'served' 
    ? `UPDATE kitchen_requests SET status = $1, served_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`
    : `UPDATE kitchen_requests SET status = $1 WHERE id = $2 RETURNING *`;

  const result = await pool.query(query, [status, requestId]);
  if (result.rows.length === 0) throw new Error("Request not found");

  const wsManager = require("../guest_management/websocket/wsManager");
  wsManager.broadcast(`kitchen:${result.rows[0].event_id}`, {
    type: `food_status_${status}`,
    request: result.rows[0],
    timestamp: new Date()
  });

  return result.rows[0];
}

module.exports = {
  requestSong,
  upvoteSong,
  getLeaderboard,
  markPlayed,
  markPlaying,
  rejectSong,
  getKitchenMilestones,
  upsertMilestone,
  startCourse,
  notifyStaff,
  checkAllergyOnArrival,
  submitFoodRequest,
  upvoteFoodRequest,
  getFoodLeaderboard,
  updateFoodRequestStatus,
};
