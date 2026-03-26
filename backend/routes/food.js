/**
 * Food Intelligence Routes
 * AI-powered food recommendations, NLP consumption logging, and historical analytics.
 *
 * Endpoints:
 *   GET  /food/:eventId/recommend       → AI menu recommendation
 *   POST /food/:eventId/consumption     → Log consumption (structured)
 *   POST /food/:eventId/chef-command    → Log consumption (natural language)
 *   GET  /food/:eventId/consumption     → Consumption report
 *   GET  /food/history/popularity       → Historical popularity rankings
 *   GET  /food/history/wasted           → Historically wasted items
 *   GET  /food/same-day/:date           → Same-day event overlap
 */

const express = require("express");
const router = express.Router();
const foodService = require("../services/foodRecommendationService");

// ─── AI Recommendation ───────────────────────────────────────

router.get("/:eventId/recommend", async (req, res) => {
  try {
    const result = await foodService.generateRecommendation(req.params.eventId);
    res.json(result);
  } catch (err) {
    console.error("Error generating recommendation:", err);
    res.status(err.message === "Event not found" ? 404 : 500).json({ error: err.message });
  }
});

// ─── Structured Consumption Logging ──────────────────────────

router.post("/:eventId/consumption", async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array is required" });
    }

    const logged = await foodService.logConsumption(req.params.eventId, items);
    res.status(201).json({
      message: `${logged.length} consumption records logged`,
      records: logged,
    });
  } catch (err) {
    console.error("Error logging consumption:", err);
    res.status(500).json({ error: "Failed to log consumption" });
  }
});

// ─── NLP Chef Command (Natural Language) ─────────────────────

router.post("/:eventId/chef-command", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: "command string is required" });
    }

    const result = await foodService.parseChefCommand(req.params.eventId, command);

    if (!result.parsed) {
      return res.status(422).json({
        message: "Could not parse the command",
        error: result.error,
      });
    }

    res.status(201).json({
      message: `Parsed and logged ${result.items.length} items from chef's command`,
      items: result.items,
    });
  } catch (err) {
    console.error("Error processing chef command:", err);
    res.status(500).json({ error: "Failed to process command" });
  }
});

// ─── Consumption Report ──────────────────────────────────────

router.get("/:eventId/consumption", async (req, res) => {
  try {
    const report = await foodService.getConsumptionReport(req.params.eventId);

    const totalPrepared = report.reduce((s, r) => s + (r.quantity_prepared || 0), 0);
    const totalConsumed = report.reduce((s, r) => s + (r.quantity_consumed || 0), 0);

    res.json({
      event_id: req.params.eventId,
      items: report,
      summary: {
        total_items: report.length,
        total_prepared: totalPrepared,
        total_consumed: totalConsumed,
        total_wasted: totalPrepared - totalConsumed,
        consumption_rate: totalPrepared > 0
          ? Math.round((totalConsumed / totalPrepared) * 100) + "%"
          : "N/A",
      },
    });
  } catch (err) {
    console.error("Error fetching consumption:", err);
    res.status(500).json({ error: "Failed to fetch consumption report" });
  }
});

// ─── Historical Popularity ───────────────────────────────────

router.get("/history/popularity", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const popular = await foodService.getHistoricalPopularity(limit);
    res.json({ popular_items: popular, count: popular.length });
  } catch (err) {
    console.error("Error fetching popularity:", err);
    res.status(500).json({ error: "Failed to fetch popularity data" });
  }
});

// ─── Wasted Items ────────────────────────────────────────────

router.get("/history/wasted", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const wasted = await foodService.getWastedItems(limit);
    res.json({ wasted_items: wasted, count: wasted.length });
  } catch (err) {
    console.error("Error fetching wasted items:", err);
    res.status(500).json({ error: "Failed to fetch waste data" });
  }
});

// ─── Same-Day Events ─────────────────────────────────────────

router.get("/same-day/:date", async (req, res) => {
  try {
    const events = await foodService.getSameDayEvents(req.params.date);
    res.json({
      date: req.params.date,
      events,
      count: events.length,
      shared_cooking_opportunity: events.length > 1,
    });
  } catch (err) {
    console.error("Error fetching same-day events:", err);
    res.status(500).json({ error: "Failed to fetch same-day events" });
  }
});

module.exports = router;
