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

module.exports = router;
