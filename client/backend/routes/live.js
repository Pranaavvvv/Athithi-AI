/**
 * Live Ops Routes
 * Real-time endpoints for the Kitchen Intelligence Board and DJ Vibe-Sync Dashboard.
 * 
 * DJ Endpoints:
 *   POST /live/dj/:eventId/request     → Submit a song request (auto-dedup + upvote)
 *   POST /live/dj/:eventId/upvote/:id  → Upvote an existing request
 *   GET  /live/dj/:eventId/leaderboard → Get ranked song requests
 *   PATCH /live/dj/playing/:id         → Mark a song as currently playing
 *   PATCH /live/dj/played/:id          → Mark a song as played
 *   PATCH /live/dj/reject/:id          → Reject a song request
 * 
 * Kitchen Endpoints:
 *   GET  /live/kitchen/:eventId/dashboard   → Full kitchen dashboard (milestones + headcount + alerts)
 *   POST /live/kitchen/:eventId/milestone   → Create a course milestone
 *   PATCH /live/kitchen/milestone/:id/start → Mark a course as started
 *   PATCH /live/kitchen/milestone/:id/notify → Notify floor staff (order ready)
 */

const express = require("express");
const router = express.Router();
const liveOps = require("../services/liveOpsService");
const headcountService = require("../guest_management/services/headcountService");
const kitchenAlertService = require("../guest_management/services/kitchenAlertService");
const wsManager = require("../guest_management/websocket/wsManager");

// ─── DJ: Song Request (with auto-dedup) ──────────────────────

router.post("/dj/:eventId/request", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { song_name, artist_name, requested_by } = req.body;

    if (!song_name) {
      return res.status(400).json({ error: "song_name is required" });
    }

    const result = await liveOps.requestSong(eventId, song_name, artist_name, requested_by);

    // Broadcast leaderboard update to DJ dashboard
    const leaderboard = await liveOps.getLeaderboard(eventId);
    wsManager.broadcast(`dj:${eventId}`, {
      type: "leaderboard_update",
      action: result.action,
      song: result.request,
      leaderboard: leaderboard.slice(0, 20), // top 20
      timestamp: new Date().toISOString(),
    });

    res.status(result.action === "created" ? 201 : 200).json({
      message: result.action === "created"
        ? `Song "${song_name}" added to queue!`
        : `Song "${song_name}" upvoted! (${result.request.upvotes} votes)`,
      ...result,
    });
  } catch (err) {
    console.error("Error requesting song:", err);
    res.status(500).json({ error: "Failed to submit song request" });
  }
});

// ─── DJ: Upvote an existing request ──────────────────────────

router.post("/dj/:eventId/upvote/:requestId", async (req, res) => {
  try {
    const { eventId, requestId } = req.params;
    const updated = await liveOps.upvoteSong(requestId);

    // Broadcast update
    const leaderboard = await liveOps.getLeaderboard(eventId);
    wsManager.broadcast(`dj:${eventId}`, {
      type: "leaderboard_update",
      action: "upvoted",
      song: updated,
      leaderboard: leaderboard.slice(0, 20),
      timestamp: new Date().toISOString(),
    });

    res.json({ message: `Upvoted! (${updated.upvotes} votes)`, request: updated });
  } catch (err) {
    console.error("Error upvoting:", err);
    res.status(400).json({ error: err.message });
  }
});

// ─── DJ: Get Leaderboard ─────────────────────────────────────

router.get("/dj/:eventId/leaderboard", async (req, res) => {
  try {
    const leaderboard = await liveOps.getLeaderboard(req.params.eventId);
    res.json({
      leaderboard,
      total: leaderboard.length,
      now_playing: leaderboard.find(s => s.status === "playing") || null,
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ─── DJ: Mark Playing ────────────────────────────────────────

router.patch("/dj/playing/:requestId", async (req, res) => {
  try {
    const song = await liveOps.markPlaying(req.params.requestId);

    // Broadcast "Your song is playing!" notification
    wsManager.broadcast(`dj:${song.event_id}`, {
      type: "now_playing",
      song,
      message: `🎵 Now playing: "${song.song_name}" by ${song.artist_name || "Unknown"}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: "Song marked as playing", song });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DJ: Mark Played ─────────────────────────────────────────

router.patch("/dj/played/:requestId", async (req, res) => {
  try {
    const song = await liveOps.markPlayed(req.params.requestId);

    wsManager.broadcast(`dj:${song.event_id}`, {
      type: "song_played",
      song,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: "Song marked as played", song });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DJ: Reject ──────────────────────────────────────────────

router.patch("/dj/reject/:requestId", async (req, res) => {
  try {
    const song = await liveOps.rejectSong(req.params.requestId);
    res.json({ message: "Song request rejected", song });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Kitchen: Full Dashboard ─────────────────────────────────

router.get("/kitchen/:eventId/dashboard", async (req, res) => {
  try {
    const { eventId } = req.params;

    const [headcount, milestones, alerts] = await Promise.all([
      headcountService.getHeadcount(eventId),
      liveOps.getKitchenMilestones(eventId),
      kitchenAlertService.getAlerts(eventId),
    ]);

    res.json({
      headcount,
      milestones,
      alerts: alerts.reverse(),
      alert_count: alerts.length,
    });
  } catch (err) {
    console.error("Error fetching kitchen dashboard:", err);
    res.status(500).json({ error: "Failed to fetch kitchen dashboard" });
  }
});

// ─── Kitchen: Create Course Milestone ────────────────────────

router.post("/kitchen/:eventId/milestone", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { course_name, target_start_time } = req.body;

    if (!course_name) {
      return res.status(400).json({ error: "course_name is required" });
    }

    const milestone = await liveOps.upsertMilestone(eventId, course_name, target_start_time);
    res.status(201).json({ message: `Milestone set for "${course_name}"`, milestone });
  } catch (err) {
    console.error("Error creating milestone:", err);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});

// ─── Kitchen: Start Course ───────────────────────────────────

router.patch("/kitchen/milestone/:milestoneId/start", async (req, res) => {
  try {
    const milestone = await liveOps.startCourse(req.params.milestoneId);

    wsManager.broadcast(`kitchen:${milestone.event_id}`, {
      type: "course_started",
      milestone,
      message: `🍽️ "${milestone.course_name}" service has started!`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: `"${milestone.course_name}" started`, milestone });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Kitchen: Notify Staff (Order Ready) ─────────────────────

router.patch("/kitchen/milestone/:milestoneId/notify", async (req, res) => {
  try {
    const milestone = await liveOps.notifyStaff(req.params.milestoneId);

    wsManager.broadcast(`kitchen:${milestone.event_id}`, {
      type: "staff_notified",
      milestone,
      message: `📢 Floor staff notified: "${milestone.course_name}" is ready for pickup!`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: "Staff notified", milestone });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
