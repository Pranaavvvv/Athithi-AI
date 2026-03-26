/**
 * WhatsApp IntelliManager Service
 * Stateful LLM concierge: session management, data context injection,
 * Featherless AI calls, and WhatsApp message dispatch.
 */
const pool = require("../guest_management/config/db");
const featherless = require("./featherless");

// ─── Session Management ──────────────────────────────────────────

async function loadSession(phoneNumber) {
  const result = await pool.query(
    "SELECT * FROM whatsapp_sessions WHERE phone_number = $1",
    [phoneNumber]
  );
  if (result.rows.length === 0) {
    const newSession = await pool.query(
      `INSERT INTO whatsapp_sessions (phone_number, state, status, session_data)
       VALUES ($1, 'GREETING', 'ENQUIRED', '{}'::jsonb) RETURNING *`,
      [phoneNumber]
    );
    return newSession.rows[0];
  }
  return result.rows[0];
}

async function saveSession(phoneNumber, state, sessionData) {
  await pool.query(
    `UPDATE whatsapp_sessions
     SET state = $1, session_data = session_data || $2::jsonb, last_interaction = CURRENT_TIMESTAMP
     WHERE phone_number = $3`,
    [state, JSON.stringify(sessionData), phoneNumber]
  );
}

// ─── Data Context Engine ──────────────────────────────────────────

async function buildDataContext() {
  // Halls (hardcoded since venues table doesn't exist yet)
  const halls = [
    { id: "hall_main", name: "Main Banquet Hall", capacity: 500, description: "Grand hall with stage, AV setup, air-conditioned", price_per_head_surcharge: 0 },
    { id: "hall_garden", name: "Royal Garden", capacity: 1000, description: "Outdoor open-air lawn with fairy lights", price_per_head_surcharge: 100 },
    { id: "hall_mini", name: "Mini Conference", capacity: 50, description: "Corporate indoor hall", price_per_head_surcharge: -50 }
  ];

  // Packages
  const packages = {
    standard: { price_per_guest: 770, label: "Standard" },
    premium: { price_per_guest: 1140, label: "Premium" },
    elite: { price_per_guest: 2600, label: "Elite" }
  };

  // Menu items from DB
  let menuItems = [];
  try {
    const menuResult = await pool.query(
      `SELECT id, item_name AS name, category, tier AS type, price_per_guest
       FROM menu_items WHERE is_active = true ORDER BY category, item_name`
    );
    menuItems = menuResult.rows.map(item => ({
      ...item,
      packages: item.type?.toLowerCase() === 'elite' ? ['elite'] : ['standard', 'premium', 'elite'],
      recommended: false
    }));
  } catch (err) {
    console.warn("[WhatsApp] Could not fetch menu items:", err.message);
  }

  // Tag popular items as recommended (from food_consumption history)
  try {
    const popularResult = await pool.query(
      `SELECT item_name FROM food_consumption
       GROUP BY item_name ORDER BY SUM(quantity_consumed) DESC LIMIT 5`
    );
    const popularNames = popularResult.rows.map(r => r.item_name.toLowerCase());
    menuItems = menuItems.map(item => ({
      ...item,
      recommended: popularNames.includes(item.name.toLowerCase())
    }));
  } catch (err) {
    // food_consumption may not exist yet, that's fine
  }

  // Decorations
  const decorations = [
    { id: "decor_royal", name: "Royal Floral", packages: ["premium", "elite"], description: "Cascading floral arrangements with gold accents" },
    { id: "decor_minimal", name: "Minimalist Elegance", packages: ["standard", "premium", "elite"], description: "Simple fairy lights and table focal points" },
    { id: "decor_grand", name: "Grand Luxe", packages: ["elite"], description: "Crystal chandeliers and imported orchids" }
  ];

  return {
    today: new Date().toISOString().split("T")[0],
    halls,
    packages,
    menu_items: menuItems,
    decorations,
    payment: {
      upi_id: "intellimanager@ybl",
      payment_link: "https://pay.hackaniche.com/intellimanager"
    }
  };
}

// ─── Core Message Processor ───────────────────────────────────────

async function processMessage(phoneNumber, userMessage) {
  // 1. Load session
  const session = await loadSession(phoneNumber);

  // 2. Build live data context
  const dataContext = await buildDataContext();

  // 3. Construct prompt
  const systemPrompt = generateSystemPrompt();
  const userPayload = `DATA CONTEXT:\n${JSON.stringify(dataContext, null, 2)}\n\nSESSION OBJECT:\n${JSON.stringify({
    state: session.state,
    status: session.status,
    ...session.session_data
  }, null, 2)}\n\nUSER MESSAGE:\n"${userMessage}"\n\nRespond ONLY with the JSON format specified in your instructions.`;

  console.log(`[IntelliManager] Processing for ${phoneNumber} (State: ${session.state})`);

  // 4. Call Featherless LLM
  let aiResponse = await featherless.callFeatherless(systemPrompt, userPayload, 2000);
  if (!aiResponse) {
    console.error("[IntelliManager] LLM returned null");
    return;
  }

  // 5. Parse JSON strictly
  let parsed;
  try {
    const cleaned = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[IntelliManager] Failed to parse LLM JSON:", aiResponse?.substring(0, 300));
    return;
  }

  // 6. Update session in DB
  if (parsed.next_state) {
    await saveSession(phoneNumber, parsed.next_state, parsed.session_updates || {});
  }

  // 7. Send WhatsApp response
  if (parsed.whatsapp_message) {
    await sendWhatsAppMessage(phoneNumber, parsed.whatsapp_message);
  }

  return parsed;
}

// ─── WhatsApp Payload Normalizer ──────────────────────────────────

/**
 * Normalizes an LLM-generated payload into a valid WhatsApp Cloud API message object.
 * Handles common LLM mistakes:
 *   1. `text` as a plain string  → {type:'text', text:{body:...}}
 *   2. `quick_replies` (FB Messenger format) → WhatsApp interactive button/list
 *   3. Already-valid payloads pass through unchanged.
 */
function normalizePayload(payload) {
  if (!payload) return null;

  // Case 1: LLM returned { text: "string", quick_replies: [...] } (Messenger format)
  if (typeof payload.text === "string" && Array.isArray(payload.quick_replies)) {
    const replies = payload.quick_replies;
    const bodyText = payload.text;

    if (replies.length <= 3) {
      // Use WhatsApp interactive buttons (max 3, title max 20 chars)
      return {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: {
            buttons: replies.map((r, i) => ({
              type: "reply",
              reply: {
                id: (r.payload || r.id || String(i)).substring(0, 256),
                title: (r.title || r.label || String(i + 1)).substring(0, 20),
              },
            })),
          },
        },
      };
    } else {
      // Use WhatsApp list message for >3 options
      return {
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: bodyText },
          action: {
            button: "Options",
            sections: [{
              title: "Choose one",
              rows: replies.map((r, i) => ({
                id: (r.payload || r.id || String(i)).substring(0, 200),
                title: (r.title || r.label || String(i + 1)).substring(0, 24),
              })),
            }],
          },
        },
      };
    }
  }

  // Case 2: `text` is a plain string but no quick_replies → plain text message
  if (typeof payload.text === "string" && !payload.quick_replies) {
    return {
      type: "text",
      text: { body: payload.text },
    };
  }

  // Case 3: Already valid WhatsApp format — pass through
  return payload;
}

// ─── WhatsApp Send (Console Simulator + Real API) ─────────────────

async function sendWhatsAppMessage(to, rawPayload) {
  // Normalize before logging or sending
  const payload = normalizePayload(rawPayload);

  console.log("\n══════════════════════════════════════════════");
  console.log(`📱 TO: ${to}`);

  if (!payload) {
    console.log(`💬 (Empty payload)`);
  } else if (payload.type === "text" && payload.text) {
    console.log(`💬 ${payload.text.body}`);
  } else if (payload.type === "interactive" && payload.interactive) {
    const iType = payload.interactive.type || "unknown";
    console.log(`🔘 INTERACTIVE [${iType.toUpperCase()}]`);
    console.log(`   Body: ${payload.interactive.body?.text || ""}`);
    if (iType === "button" && payload.interactive.action?.buttons) {
      payload.interactive.action.buttons.forEach(b =>
        console.log(`   [🔘 ${b.reply?.title}] (${b.reply?.id})`)
      );
    } else if (iType === "list" && payload.interactive.action?.sections) {
      payload.interactive.action.sections.forEach(s => {
        console.log(`   📂 ${s.title}`);
        s.rows?.forEach(r => console.log(`      - ${r.title}: ${r.description || ""} (${r.id})`));
      });
    }
  } else {
    console.log(`💬 RAW:\n${JSON.stringify(payload, null, 2)}`);
  }
  console.log("══════════════════════════════════════════════\n");

  // Send live response via Meta Graph API
  if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID) {
    try {
      const axios = require('axios');
      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
        { messaging_product: "whatsapp", recipient_type: "individual", to, ...payload },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          }
        }
      );
    } catch (err) {
      console.error("Meta Graph API Error:", err.response?.data || err.message);
    }
  } else {
    console.log("⚠️ WHATSAPP_TOKEN or PHONE_NUMBER_ID missing in .env. Bot response not sent to live WhatsApp API.");
  }
}

// ─── The Master System Prompt ─────────────────────────────────────

function generateSystemPrompt() {
  return `You are IntelliManager, an AI-powered banquet booking concierge operating on WhatsApp via the WhatsApp Business Cloud API. You manage the complete event booking lifecycle. You are stateful — every message includes the current conversation state and session data as JSON.

## CORE RULES
You operate as a strict state machine. You NEVER skip states, NEVER collect information out of order, and NEVER invent data. All halls, menus, prices, decorations come from the DATA CONTEXT.

Every response MUST be exactly this JSON shape (nothing else):
{
  "next_state": "<STATE_NAME>",
  "session_updates": { ...fields to merge into session },
  "whatsapp_message": { ...WhatsApp Cloud API message object }
}

## STATES (in order)
1. GREETING — Send welcome with 3 buttons: book_event, my_booking, talk_to_someone. On "book_event" → COLLECT_BASICS
2. COLLECT_BASICS — Free-form AI conversation. Collect: event_name, occasion_type, client_name, client_phone, guest_count, event_date (YYYY-MM-DD, ≥7 days from today), event_time_slot (morning/afternoon/evening). Ask 1-2 fields at a time. When ALL collected → SELECT_PACKAGE
3. SELECT_PACKAGE — Send interactive LIST: Standard (₹770/guest), Premium (₹1,140/guest), Elite (₹2,600/guest). Calculate estimated_cost. → SELECT_VENUE
4. SELECT_VENUE — Filter halls by capacity ≥ guest_count from DATA CONTEXT. Send interactive LIST. → SELECT_MENU_TYPE
5. SELECT_MENU_TYPE — Send BUTTON: Pure Veg, Veg + Non-Veg, Jain Menu. → SELECT_MENU_ITEMS
6. SELECT_MENU_ITEMS — Send interactive lists per category (Starters→Mains→Desserts→Beverages). Items with "recommended: true" should be pitched as "Guest Favorites". → SELECT_DECORATION
7. SELECT_DECORATION — Send interactive LIST filtered by package. → SUMMARY_CONFIRM
8. SUMMARY_CONFIRM — Send full text summary, then separate confirm/edit buttons. On confirm → SELECT_INSTALLMENT. On edit → go back to relevant state.
9. SELECT_INSTALLMENT — Send LIST: 30/40/30 or 50/50 plan with calculated amounts. → PAYMENT_INITIATION
10. PAYMENT_INITIATION — Send payment link + schedule from DATA CONTEXT. → AWAITING_FINANCE
11. AWAITING_FINANCE — Only respond: "Your booking is pending confirmation."
12. DONE — Confirmed. Send booking ID and details.

## GLOBAL RULES
- NEVER invent data. Use only DATA CONTEXT.
- NEVER combine states.
- Date must be ≥7 days from today.
- Guest count minimum 10.
- If user types HELP: show current state info. If RESTART: confirm, then reset to GREETING.
- Tone: Warm, professional, concise. Vary affirmations.
- If user sends free-text during structured state, parse intent and map to correct option.
- Output ONLY valid JSON. No markdown, no explanation outside the JSON.

## WHATSAPP CLOUD API MESSAGE FORMAT — MANDATORY

CRITICAL: whatsapp_message MUST use ONLY the WhatsApp Cloud API format below.
NEVER use "quick_replies", "buttons" as top-level keys, or "text" as a plain string.

### Plain text:
{ "type": "text", "text": { "body": "Your message here" } }

### Interactive buttons (<=3 options):
{
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "What would you like to do?" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "book_event", "title": "Book an Event" } },
        { "type": "reply", "reply": { "id": "my_booking", "title": "My Booking" } },
        { "type": "reply", "reply": { "id": "talk_to_someone", "title": "Talk to Someone" } }
      ]
    }
  }
}

### Interactive list (>3 options or package/venue/menu selection):
{
  "type": "interactive",
  "interactive": {
    "type": "list",
    "body": { "text": "Please choose a package:" },
    "action": {
      "button": "View Options",
      "sections": [
        {
          "title": "Packages",
          "rows": [
            { "id": "standard", "title": "Standard", "description": "770/guest" },
            { "id": "premium", "title": "Premium", "description": "1140/guest" },
            { "id": "elite", "title": "Elite", "description": "2600/guest" }
          ]
        }
      ]
    }
  }
}

### GREETING example — copy this exact structure:
{
  "next_state": "GREETING",
  "session_updates": {},
  "whatsapp_message": {
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": { "text": "Welcome to IntelliManager! How can I help you today?" },
      "action": {
        "buttons": [
          { "type": "reply", "reply": { "id": "book_event", "title": "Book an Event" } },
          { "type": "reply", "reply": { "id": "my_booking", "title": "My Booking" } },
          { "type": "reply", "reply": { "id": "talk_to_someone", "title": "Talk to Someone" } }
        ]
      }
    }
  }
}
`;
}

module.exports = {
  processMessage,
  loadSession,
  buildDataContext,
  saveSession
};
