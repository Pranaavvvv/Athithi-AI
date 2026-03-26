/**
 * VAPI AI Voice Agent Service
 * Handles tool call dispatching (fetching menus, checking availability, making bookings)
 * and the out-of-band Visual Sync engine for real-time web UI updates.
 */

const pool = require("../guest_management/config/db");
const wsManager = require("../guest_management/websocket/wsManager");

// Assuming we want to send WhatsApp as a fallback, we can use the existing Meta Graph sender if configured
// const axios = require("axios");

// ─── 1. Tool Call Handlers ──────────────────────────────────────────

async function checkAvailability(args) {
  const date = args.date || new Date().toISOString().split('T')[0];
  const guest_count = args.guest_count || 100;
  
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM events WHERE event_date::date = $1::date AND status IN ('BOOKED', 'COMPLETED')`,
      [date]
    );
    
    return {
      is_available: result.rows[0].count === '0',
      available_halls: [
        { name: "Royal Garden", capacity: 1000 },
        { name: "Main Banquet Hall", capacity: 500 }
      ].filter(h => h.capacity >= guest_count)
    };
  } catch (err) {
    console.error("[Vapi] checkAvailability failed:", err.message);
    return { is_available: true, available_halls: [{ name: "Main Banquet Hall", capacity: 500 }] };
  }
}

async function getPricingTiers() {
  return {
    tiers: [
      { name: "Standard", base_price: 770, includes: "Basic decor, welcome drinks" },
      { name: "Premium", base_price: 1140, includes: "Floral decor, live counters" },
      { name: "Elite", base_price: 2600, includes: "Imported flowers, luxury catering" }
    ]
  };
}

async function getMenuCatalog(args) {
  const tier = args.tier || "Premium";
  
  try {
    const menuResult = await pool.query(
      `SELECT item_name, category, price_per_guest 
       FROM menu_items 
       WHERE LOWER(tier::text) = LOWER($1) AND is_active = true
       ORDER BY category, item_name`,
      [tier]
    );
    
    // Group by category for the AI to read easily
    const grouped = menuResult.rows.reduce((acc, curr) => {
      // Normalize category names (e.g., 'starter' -> 'Starter')
      const cat = curr.category.charAt(0).toUpperCase() + curr.category.slice(1);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(curr.item_name);
      return acc;
    }, {});

    // Automatically push the real Database Menu to the visual UI instantly!
    wsManager.broadcast("vapi:visuals", {
      action: "show_visual",
      target: "general",
      content: {
        type: "menu",
        title: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Menu`,
        items: grouped
      }
    });

    return { catalog: grouped };
  } catch (err) {
     console.error("[VAPI DB] Failed to fetch menu catalog:", err.message);
     return { catalog: {} };
  }
}

async function getAiRecommendation(args) {
  const { date, tier, guest_count } = args;
  const { generateClientSuggestion } = require("./foodRecommendationService");
  try {
    const result = await generateClientSuggestion(date || "2026-12-01", tier || "Premium", guest_count || 100);
    return result;
  } catch (err) {
    return { error: "Recommendation engine unavailable.", suggestion: null };
  }
}

async function generateQuote(args) {
  const package_name = String(args.package_name || "Premium");
  const guests = Number(args.guests || 100);
  const hall = String(args.hall || "Main Banquet Hall");
  
  let basePrice = 1000;
  if (package_name.toLowerCase() === 'standard') basePrice = 770;
  if (package_name.toLowerCase() === 'premium') basePrice = 1140;
  if (package_name.toLowerCase() === 'elite') basePrice = 2600;

  const total = basePrice * guests;

  // Automatically push the Quote to the user's screen drawer
  wsManager.broadcast("vapi:visuals", {
    action: "show_visual",
    target: "general",
    content: {
      type: "menu",
      title: "Event Cost Estimate 💰",
      items: [
        `Venue: ${hall}`,
        `Selected Package: ${package_name.toUpperCase()} Tier`,
        `Estimated Guests: ${guests}`,
        `Rate per plate: ₹${basePrice}`,
        `Total Base Cost: ₹${total.toLocaleString('en-IN')}`
      ]
    }
  });

  return {
    package: package_name,
    guests,
    hall,
    total_estimated_amount: total,
    currency: "INR"
  };
}

async function createBooking(args) {
  const crypto = require('crypto');
  const event_id = crypto.randomUUID();
  const party_name = String(args.event_name || "New Event");
  const event_date = String(args.date || new Date().toISOString().split('T')[0]);
  const guest_count = Number(args.guest_count || 100);
  const menu_tier = String(args.package_name || "Premium").toUpperCase();
  const client_phone = String(args.client_phone || "Unknown");
  const client_name = String(args.client_name || "Guest User");
  const location = "Main Banquet Hall";
  
  try {
    const result = await pool.query(
      `INSERT INTO events (id, party_name, event_date, guest_count, menu_tier, status, client_phone, client_name, location, addons_amount, gst_percentage)
       VALUES ($1, $2, $3, $4, $5, 'ENQUIRY', $6, $7, $8, 0.00, 18.00) RETURNING id`,
      [event_id, party_name, event_date, guest_count, menu_tier, client_phone, client_name, location]
    );

    // Broadcast the final Booking summary
    wsManager.broadcast("vapi:visuals", {
      action: "show_visual",
      target: "general",
      content: {
        type: "menu",
        title: "Booking Confirmed ✅",
        items: [
          `Event Name: ${party_name}`,
          `Date: ${event_date}`,
          `Guests: ${guest_count}`,
          `Package: ${menu_tier.toUpperCase()}`,
          `Contact: ${client_phone}`,
          `Ref ID: ${result.rows[0].id.substring(0,8)}`
        ]
      }
    });

    return { success: true, booking_id: result.rows[0].id, message: "Booking enquiry created successfully." };
  } catch (err) {
    console.error("[Vapi] Booking creation failed:", err.message);
    return { success: false, error: "Failed to save booking." };
  }
}

// ─── 2. Visual Sync (Out-of-Band Engine) ───────────────────────────

async function pushVisualContent(args) {
  const user_identifier = args.user_identifier || "general";
  const content_type = args.content_type || "generic";
  const data = args.data || { title: "Visual Data", items: ["Item 1", "Item 2"] };
  
  // Prevent AI from overwriting the real dynamic menu with a hallucinated empty payload
  if (content_type === "menu") {
    return { success: true, message: "The menu is already pushed to the user's screen atomically! Tell them they can click the items to customize their package." };
  }
  console.log(`[VAPI VISUAL SYNC] Pushing '${content_type}' visual to ${user_identifier}`);

  let payload = {};

  if (content_type === "menu") {
    payload = {
      type: "menu",
      title: data.title || "Proposed Menu",
      items: data.items || [],
      pdf_url: data.link || null
    };
  } else if (content_type === "image") {
    payload = {
      type: "image",
      url: data.url || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80",
      caption: data.caption || "Image generation reference"
    };
  } else if (content_type === "list") {
    payload = {
      type: "list",
      title: data.title || "Options",
      items: data.items || []
    };
  } else {
    payload = { type: "generic", data };
  }

  try {
    // Broadcast to Website via WebSockets (Live Session Sync)
    wsManager.broadcast("vapi:visuals", {
      action: "show_visual",
      target: user_identifier,
      content: payload
    });
  } catch (err) {
    console.error("[VAPI VISUAL SYNC] WebSocket broadcast failed:", err.message);
  }

  return { 
    success: true, 
    message: `Securely broadcasted ${content_type} to the client's screen.` 
  };
}

// ─── 3. Secure Web Call Initiator ───────────────────────────────────

async function initiateWebCall() {
  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    throw new Error("VAPI_API_KEY or VAPI_ASSISTANT_ID missing in .env");
  }

  const axios = require('axios');
  
  const response = await axios.post(
    "https://api.vapi.ai/call",
    { assistantId: assistantId },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

// ─── 4. Main Dispatcher ───────────────────────────────────────────

async function handleToolCall(toolCallList) {
  const results = [];
  console.dir({ RAW_TOOL_CALL_LIST: toolCallList }, { depth: null });
  
  for (const tool of toolCallList) {
    // VAPI wraps OpenAI function calls in `{ tool: {...}, toolCall: {...} }`
    const { function: fn } = tool.toolCall || tool;
    const toolCallId = tool.toolCall ? tool.toolCall.id : tool.id;
    
    // Safely parse arguments whether it's an object or a string
    let args = {};
    try {
      if (typeof fn.arguments === 'string') {
        args = JSON.parse(fn.arguments);
      } else if (typeof fn.arguments === 'object' && fn.arguments !== null) {
        args = fn.arguments;
      }
    } catch (e) {
      console.error("[VAPI TOOL] Failed to parse arguments:", fn.arguments);
    }

    let result = null;
    console.log(`[VAPI TOOL] ${fn.name} invoked with`, args);

    switch (fn.name) {
      case "check_availability": result = await checkAvailability(args); break;
      case "get_pricing_tiers": result = await getPricingTiers(); break;
      case "get_menu_catalog": result = await getMenuCatalog(args); break;
      case "get_ai_recommendation": result = await getAiRecommendation(args); break;
      case "generate_quote": result = await generateQuote(args); break;
      case "create_booking": result = await createBooking(args); break;
      case "push_visual_content": result = await pushVisualContent(args); break;
      default:
        result = { error: `Function ${fn.name} not implemented.` };
    }

    results.push({
      toolCallId: toolCallId,
      result: result
    });
  }

  return results;
}

// ─── 4. End of Call Lifecyle ──────────────────────────────────────

async function saveCallReport(messageData) {
  const call = messageData.call;
  const transcript = messageData.transcript || "";
  const summary = messageData.summary || "No summary provided.";
  const recordingUrl = messageData.recordingUrl || null;
  
  // Extract phone number from call.customer.number if available
  const phone = call?.customer?.number || "Unknown";
  const startedAt = call?.createdAt ? new Date(call.createdAt) : new Date();

  console.log(`[VAPI] Saving end-of-call report for call ID: ${call?.id}`);

  try {
    await pool.query(
      `INSERT INTO voice_sessions (call_id, phone_number, summary, transcript, recording_url, started_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (call_id) DO UPDATE SET
       summary = EXCLUDED.summary, transcript = EXCLUDED.transcript, recording_url = EXCLUDED.recording_url`,
      [call?.id || 'simulated_call', phone, summary, transcript, recordingUrl, startedAt]
    );
  } catch (err) {
    console.error("[VAPI] Failed to save call report:", err.message);
  }
}

module.exports = {
  handleToolCall,
  saveCallReport,
  initiateWebCall
};
