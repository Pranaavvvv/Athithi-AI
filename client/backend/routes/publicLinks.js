const express = require("express");
const router = express.Router();
const pool = require("../config/dbConfig");

// @route   GET /kitchen/:eventToken
// @desc    Public read-only Kitchen URL per event
// @access  Public (No auth required)
router.get("/kitchen/:eventToken", async (req, res) => {
    const { eventToken } = req.params;

    try {
        const result = await pool.query(
            "SELECT id, name, created_at FROM events WHERE event_token = $1", 
            [eventToken]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Invalid event token. No event found." });
        }

        const event = result.rows[0];
        
        // Return read-only data for the kitchen interface
        res.json({
            message: "Welcome to the Kitchen view",
            event: event,
            // You can also fetch event's food/menu details here
        });

    } catch (err) {
        console.error("Error accessing kitchen link:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   GET /dj/:eventToken
// @desc    Public read-only DJ URL per event
// @access  Public (No auth required)
router.get("/dj/:eventToken", async (req, res) => {
    const { eventToken } = req.params;

    try {
        const result = await pool.query(
            "SELECT id, name, created_at FROM events WHERE event_token = $1", 
            [eventToken]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Invalid event token. No event found." });
        }

        const event = result.rows[0];
        
        // Return read-only data for the DJ interface
        res.json({
            message: "Welcome to the DJ view",
            event: event,
            // You can also fetch event song requests/playlist info here
        });

    } catch (err) {
        console.error("Error accessing DJ link:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
