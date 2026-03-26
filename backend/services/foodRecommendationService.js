/**
 * Food Recommendation Service
 * AI-powered food intelligence: same-day overlap, historical popularity,
 * natural language consumption parsing, and LLM recommendations.
 */

const pool = require("../guest_management/config/db");
const featherless = require("./featherless");

// ─── Same-Day Event Overlap ──────────────────────────────────

/**
 * Find all events on the same date and their menu items.
 * This enables shared cooking suggestions to save costs.
 */
async function getSameDayEvents(eventDate) {
  const result = await pool.query(
    `SELECT e.id, e.party_name, e.menu_tier, e.guest_count, e.event_date,
            COALESCE(json_agg(json_build_object(
              'item_name', mi.item_name,
              'category', mi.category,
              'price_per_guest', mi.price_per_guest
            )) FILTER (WHERE mi.id IS NOT NULL), '[]') AS menu_items
     FROM events e
     LEFT JOIN menu_items mi ON LOWER(mi.tier::text) = LOWER(e.menu_tier::text) AND mi.is_active = true
     WHERE DATE(e.event_date) = DATE($1)
       AND e.status::text IN ('BOOKED', 'WON')
     GROUP BY e.id
     ORDER BY e.event_date`,
    [eventDate]
  );
  return result.rows;
}

// ─── Historical Popularity ───────────────────────────────────

/**
 * Aggregate historical consumption data to find most/least popular items.
 * Returns items ranked by total consumption across all past events.
 */
async function getHistoricalPopularity(limit = 20) {
  const result = await pool.query(
    `SELECT 
       item_name,
       category,
       COUNT(DISTINCT event_id) AS events_served,
       SUM(quantity_prepared) AS total_prepared,
       SUM(quantity_consumed) AS total_consumed,
       SUM(quantity_prepared - quantity_consumed) AS total_wasted,
       CASE WHEN SUM(quantity_prepared) > 0
            THEN ROUND(SUM(quantity_consumed)::numeric / SUM(quantity_prepared) * 100, 1)
            ELSE 0 END AS consumption_rate
     FROM food_consumption
     GROUP BY item_name, category
     ORDER BY total_consumed DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Get items that are consistently wasted (low consumption rate).
 */
async function getWastedItems(limit = 10) {
  const result = await pool.query(
    `SELECT 
       item_name, category,
       SUM(quantity_prepared) AS total_prepared,
       SUM(quantity_consumed) AS total_consumed,
       SUM(quantity_prepared - quantity_consumed) AS total_wasted,
       ROUND(SUM(quantity_consumed)::numeric / NULLIF(SUM(quantity_prepared), 0) * 100, 1) AS consumption_rate
     FROM food_consumption
     WHERE quantity_prepared > 0
     GROUP BY item_name, category
     HAVING SUM(quantity_prepared) > SUM(quantity_consumed)
     ORDER BY total_wasted DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ─── Consumption Logging ─────────────────────────────────────

/**
 * Log food consumption for an event (structured input).
 */
async function logConsumption(eventId, items) {
  const results = [];
  for (const item of items) {
    const result = await pool.query(
      `INSERT INTO food_consumption (event_id, item_name, category, quantity_prepared, quantity_consumed, unit, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        eventId,
        item.item_name,
        item.category || null,
        item.quantity_prepared || 0,
        item.quantity_consumed || 0,
        item.unit || "portions",
        item.notes || null,
      ]
    );
    results.push(result.rows[0]);
  }
  return results;
}

/**
 * Get consumption report for an event.
 */
async function getConsumptionReport(eventId) {
  const result = await pool.query(
    `SELECT *, (quantity_prepared - quantity_consumed) AS wasted
     FROM food_consumption
     WHERE event_id = $1
     ORDER BY category, item_name`,
    [eventId]
  );
  return result.rows;
}

// ─── NLP Consumption Parsing (Chef's Natural Language Input) ──

/**
 * Parse a chef's natural language command into structured consumption data.
 * Example inputs:
 *   "50 paneer tikka left, 200 butter chicken made"
 *   "100 units of gulab jamun prepared, only 60 were eaten"
 *   "biryani was all consumed, 30 naan wasted"
 */
async function parseChefCommand(eventId, command) {
  const systemPrompt = `You are a kitchen inventory parser for a banquet management system.
Parse the chef's natural language input into structured consumption data.

Rules:
- Extract each dish mentioned with its quantities
- "left" or "remaining" or "wasted" = quantity_prepared - quantity_consumed (it's the waste)
- "made" or "prepared" = quantity_prepared
- "eaten" or "consumed" or "served" = quantity_consumed
- "all consumed" = quantity_consumed equals quantity_prepared
- If only one quantity is given with "left/remaining", infer the rest
- Guess the category: starter, main_course, dessert, beverage, bread, appetizer

Return ONLY a valid JSON array:
[
  {
    "item_name": "string",
    "category": "string",
    "quantity_prepared": number,
    "quantity_consumed": number,
    "notes": "original text reference"
  }
]
IMPORTANT: Return ONLY valid JSON array, no markdown, no explanation.`;

  const userPrompt = `Chef's input: "${command}"`;

  try {
    const aiResponse = await featherless.callFeatherless(systemPrompt, userPrompt, 500);
    if (!aiResponse) {
      return { parsed: false, error: "AI service unavailable", items: [] };
    }

    let items;
    try {
      items = JSON.parse(aiResponse.trim());
    } catch (e) {
      const cleaned = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      items = JSON.parse(cleaned);
    }

    // Log the parsed items
    const logged = await logConsumption(eventId, items);

    return { parsed: true, items: logged, raw_ai_response: aiResponse };
  } catch (err) {
    console.error("Chef command parse failed:", err.message);
    return { parsed: false, error: err.message, items: [] };
  }
}

// ─── AI Recommendation ───────────────────────────────────────

/**
 * Generate a full AI-powered food recommendation for an event.
 * Considers: event details, same-day overlap, historical popularity, waste data.
 */
async function generateRecommendation(eventId) {
  // 1. Fetch event details
  const eventResult = await pool.query(
    `SELECT id, party_name, menu_tier, guest_count, event_date, location, total_quoted_amount
     FROM events WHERE id = $1`,
    [eventId]
  );
  if (eventResult.rows.length === 0) throw new Error("Event not found");
  const event = eventResult.rows[0];

  // 2. Fetch available menu items for this tier
  const menuResult = await pool.query(
    `SELECT item_name, category, price_per_guest
     FROM menu_items
     WHERE LOWER(tier::text) = LOWER($1) AND is_active = true
     ORDER BY category, item_name`,
    [event.menu_tier]
  );
  const menuItems = menuResult.rows;

  // 3. Get same-day events
  const sameDayEvents = await getSameDayEvents(event.event_date);
  const otherEvents = sameDayEvents.filter((e) => e.id !== eventId);

  // 4. Get historical popularity
  const popular = await getHistoricalPopularity(15);
  const wasted = await getWastedItems(10);

  // 5. Build AI prompt
  const systemPrompt = `You are a Food Intelligence AI for a banquet management platform.
Your job is to recommend an optimized menu for an event based on:
1. Available menu items for the event's tier
2. Other events happening on the same day (shared cooking saves cost)
3. Historical consumption data (popular items vs. wasted items)

Provide:
- Recommended dishes with quantities per guest
- Shared cooking opportunities with same-day events
- Items to AVOID (historically wasted)
- Items to PUSH (historically popular)
- Estimated cost savings from shared cooking
- Suggested preparation quantities (to minimize waste)

Respond as a well-structured markdown report.`;

  const eventContext = `EVENT DETAILS:
- Name: ${event.party_name}
- Date: ${event.event_date}
- Guests: ${event.guest_count}
- Menu Tier: ${event.menu_tier}
- Budget: ₹${event.total_quoted_amount || "Not set"}

AVAILABLE MENU ITEMS (${event.menu_tier} tier):
${menuItems.map((m) => `- [${m.category}] ${m.item_name} — ₹${m.price_per_guest}/guest`).join("\n")}

SAME-DAY EVENTS (${otherEvents.length} others):
${otherEvents.length > 0
    ? otherEvents.map((e) => `- "${e.party_name}" (${e.guest_count} guests, ${e.menu_tier} tier): ${JSON.stringify(e.menu_items.slice(0, 5).map((i) => i.item_name))}`).join("\n")
    : "No other events on this date."}

HISTORICAL POPULAR ITEMS (Top ${popular.length}):
${popular.map((p) => `- ${p.item_name} [${p.category}]: served at ${p.events_served} events, ${p.consumption_rate}% consumed`).join("\n") || "No historical data yet."}

HISTORICALLY WASTED ITEMS:
${wasted.map((w) => `- ${w.item_name}: ${w.total_wasted} portions wasted across events (${w.consumption_rate}% consumption rate)`).join("\n") || "No waste data yet."}`;

  const aiResponse = await featherless.callFeatherless(systemPrompt, eventContext, 1500);

  // 6. Save recommendation
  const saved = await pool.query(
    `INSERT INTO food_recommendations (event_id, recommendation_type, recommendation_text, same_day_events, historical_context, cost_savings_estimate)
     VALUES ($1, 'full_menu', $2, $3, $4, $5)
     RETURNING *`,
    [
      eventId,
      aiResponse || "AI service unavailable. Please try again.",
      JSON.stringify(otherEvents.map((e) => ({ id: e.id, name: e.party_name, guests: e.guest_count, tier: e.menu_tier }))),
      JSON.stringify({ popular: popular.slice(0, 5), wasted: wasted.slice(0, 5) }),
      null, // cost savings calculated by AI in the text
    ]
  );

  return {
    event: {
      id: event.id,
      name: event.party_name,
      date: event.event_date,
      guests: event.guest_count,
      tier: event.menu_tier,
    },
    recommendation: aiResponse,
    same_day_overlap: otherEvents.length,
    historical_data_points: popular.length + wasted.length,
    saved_recommendation_id: saved.rows[0].id,
  };
}

module.exports = {
  getSameDayEvents,
  getHistoricalPopularity,
  getWastedItems,
  logConsumption,
  getConsumptionReport,
  parseChefCommand,
  generateRecommendation,
};
