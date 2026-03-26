const express = require('express');
const router = express.Router();
const pool = require('../config/dbConfig');
const featherless = require('../services/featherless');

/**
 * [GET] /api/ema/source-vendors
 * Query: ?category=decor&budget=20000
 * Logic: Queries DB for vendors in category, ranks them via Featherless.ai Efficiency Pilot.
 */
router.get('/source-vendors', async (req, res) => {
    try {
        const { category, budget } = req.query;

        if (!category) {
            return res.status(400).json({ error: "Missing 'category' query parameter." });
        }

        // Fetch vendors from PostgreSQL
        const vendorQuery = await pool.query(
            "SELECT * FROM vendors WHERE LOWER(category) = $1",
            [category.toLowerCase()]
        );
        
        const vendors = vendorQuery.rows;

        if (vendors.length === 0) {
            return res.status(200).json({ message: `No vendors found for category '${category}'`, ranked_vendors: [] });
        }

        // Rank vendors using Operational Friction Score
        const targetBudget = budget ? Number(budget) : 50000;
        const rankedVendors = await featherless.calculateOperationalFriction(vendors, targetBudget);

        return res.status(200).json({
            category,
            target_budget: targetBudget,
            ranked_vendors: rankedVendors
        });
    } catch (err) {
        console.error("Error sourcing vendors:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * [POST] /api/ema/bids
 * Body: { event_id, vendor_id, quoted_amount }
 * Logic: Records a bid in the DB.
 */
router.post('/bids', async (req, res) => {
    try {
        const { event_id, vendor_id, quoted_amount } = req.body;

        if (!event_id || !vendor_id || !quoted_amount) {
            return res.status(400).json({ error: "Requires event_id, vendor_id, and quoted_amount" });
        }

        const newBid = await pool.query(
            `INSERT INTO vendor_bids (event_id, vendor_id, quoted_amount, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [event_id, vendor_id, quoted_amount]
        );

        return res.status(201).json({
            message: "Bid logged successfully. Await negotiation.",
            bid: newBid.rows[0]
        });
    } catch (err) {
        console.error("Error logging bid:", err);
        return res.status(500).json({ error: "Internal server error. Invalid UUIDs?" });
    }
});

/**
 * [POST] /api/ema/ops/ping
 * Body: { event_id, department, notes }
 * Logic: Event Manager dispatches a readiness request for a specific department.
 */
router.post('/ops/ping', async (req, res) => {
    try {
        const { event_id, department, notes } = req.body;

        if (!event_id || !department) {
            return res.status(400).json({ error: "Requires event_id and department" });
        }

        const ping = await pool.query(
            `INSERT INTO ops_coordination (event_id, department, is_ready, notes)
             VALUES ($1, $2, FALSE, $3)
             ON CONFLICT (event_id, department) 
             DO UPDATE SET notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [event_id, department, notes || "Check-Ready Ping Sent"]
        );

        return res.status(200).json({
            message: `Ping sent to ${department} for readiness check.`,
            coordination: ping.rows[0]
        });
    } catch (err) {
        console.error("Error pinging ops:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * [GET] /api/ema/ops/:event_id
 * Retrieves the readiness states. The UI can use this to disable the "Generate FP" button until everyone is ready.
 */
router.get('/ops/:event_id', async (req, res) => {
    try {
        const { event_id } = req.params;

        const ops = await pool.query(
            "SELECT * FROM ops_coordination WHERE event_id = $1",
            [event_id]
        );

        const all_ready = ops.rows.length > 0 && ops.rows.every(row => row.is_ready === true);

        return res.status(200).json({
            event_id,
            total_departments_pinged: ops.rows.length,
            all_ready,
            departments: ops.rows
        });
    } catch (err) {
        console.error("Error viewing ops status:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * [GET] /api/ema/events/by-phone?phone=9876543210
 * Returns all events where client_phone matches the provided number.
 * Strips non-digit characters for flexible matching.
 */
router.get('/events/by-phone', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ error: "Missing 'phone' query parameter." });
        }
        // Normalize: keep digits only, then match on the last 10 digits if long
        const digits = phone.replace(/\D/g, '');
        const searchNum = digits.length > 10 ? digits.slice(-10) : digits;

        const result = await pool.query(
            `SELECT * FROM events
             WHERE REGEXP_REPLACE(client_phone, '[^0-9]', '', 'g') LIKE $1
             ORDER BY created_at DESC NULLS LAST, event_date DESC`,
            [`%${searchNum}`]
        );
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching events by phone:", err.message);
        return res.status(500).json({ error: "Failed to fetch events by phone" });
    }
});

/**
 * [GET] /api/ema/events
 * Local proxy: Fetches events directly from the shared PostgreSQL DB.
 * Avoids depending on the Render-hosted Python Finance API.
 */
router.get('/events', async (req, res) => {
    try {
        const statusFilter = req.query.status_filter;
        let query = 'SELECT * FROM events ORDER BY created_at DESC NULLS LAST, event_date DESC';
        const params = [];

        if (statusFilter) {
            query = 'SELECT * FROM events WHERE UPPER(status::text) = UPPER($1) ORDER BY created_at DESC NULLS LAST, event_date DESC';
            params.push(statusFilter);
        }

        const result = await pool.query(query, params);
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error fetching events locally:", err.message);
        return res.status(500).json({ error: "Failed to fetch events" });
    }
});

module.exports = router;
