const pool = require('../config/dbConfig');
const featherless = require('./featherless');

/**
 * The EMA Automator is a background worker that polls the database for newly BOOKED events.
 * It automatically sources vendors for standard categories (Decor, Sound, Kitchen) and 
 * records the AI recommendations into the ops_coordination table for the Event Manager to review.
 */
async function runAutoSourcing() {
    try {
        // Find events that are BOOKED but don't have auto-sourcing completed in ops_coordination
        const res = await pool.query(`
            SELECT id, menu_tier, total_quoted_amount 
            FROM events 
            WHERE status = 'BOOKED' 
              AND NOT EXISTS (
                  SELECT 1 FROM ops_coordination 
                  WHERE event_id = events.id AND department = 'auto_sourcing'
              )
        `);

        for (const event of res.rows) {
            console.log(`[EMA Automator] New BOOKED event detected: ${event.id}. Sourcing vendors...`);
            
            // Assume 40% of the budget goes to vendors
            const opsBudget = (Number(event.total_quoted_amount) || 100000) * 0.40;
            const categoryBudget = opsBudget / 3; 

            const categories = ['decor', 'sound', 'kitchen'];
            let recommendationNotes = `AUTOMATED SOURCING REPORT:\n\n`;

            for (const category of categories) {
                const vQuery = await pool.query("SELECT * FROM vendors WHERE LOWER(category) = $1", [category]);
                if (vQuery.rows.length > 0) {
                    const ranked = await featherless.calculateOperationalFriction(vQuery.rows, categoryBudget);
                    const top = ranked[0];
                    recommendationNotes += `- Top ${category.toUpperCase()} Vendor: ${top.name} (Price: ₹${top.base_price_point}, AI Score: ${top.efficiency_pilot.friction_score}/10). Reason: ${top.efficiency_pilot.reasoning}\n`;
                } else {
                    recommendationNotes += `- No vendors found for ${category.toUpperCase()}\n`;
                }
            }

            // Save the recommendations into ops_coordination
            await pool.query(
                `INSERT INTO ops_coordination (event_id, department, is_ready, notes)
                 VALUES ($1, 'auto_sourcing', TRUE, $2)`,
                [event.id, recommendationNotes]
            );

            console.log(`[EMA Automator] Auto-sourcing complete for event: ${event.id}`);
        }
    } catch (err) {
        console.error("[EMA Automator] Error in auto-sourcing loop:", err.message);
    }
}

// Poll every 30 seconds
function start() {
    console.log("[EMA Automator] Background worker started. Polling for BOOKED events...");
    setInterval(runAutoSourcing, 30000);
    // Run immediately once
    setTimeout(runAutoSourcing, 2000);
}

module.exports = { start };
