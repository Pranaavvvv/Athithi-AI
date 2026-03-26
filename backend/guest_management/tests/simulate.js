/**
 * Guest Management — E2E Simulation Script
 * Simulates the full flow: event creation → booking → QR → RSVP → arrivals → kitchen alerts
 *
 * This script talks DIRECTLY to the database (no server needed).
 * It simulates status changes and the complete lifecycle.
 *
 * Usage: node tests/simulate.js
 */

const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const qrService = require("../services/qrService");
const rsvpService = require("../services/rsvpService");
const headcountService = require("../services/headcountService");
const kitchenAlertService = require("../services/kitchenAlertService");

// ─── Configuration ──────────────────────────────────────────
const NUM_GUESTS = 10;
const EVENT_NAME = "Simulated Gala Dinner";
const ARRIVAL_DELAY_MS = 500; // delay between simulated arrivals

// Fake guest data
const FAKE_GUESTS = [
  { name: "Aarav Patel", email: "aarav@example.com", phone: "+91-9876543210" },
  { name: "Priya Sharma", email: "priya@example.com", phone: "+91-9876543211" },
  { name: "Rohan Mehta", email: "rohan@example.com", phone: "+91-9876543212" },
  { name: "Ananya Gupta", email: "ananya@example.com", phone: "+91-9876543213" },
  { name: "Vikram Singh", email: "vikram@example.com", phone: "+91-9876543214" },
  { name: "Sneha Joshi", email: "sneha@example.com", phone: "+91-9876543215" },
  { name: "Arjun Reddy", email: "arjun@example.com", phone: "+91-9876543216" },
  { name: "Kavya Nair", email: "kavya@example.com", phone: "+91-9876543217" },
  { name: "Aditya Kumar", email: "aditya@example.com", phone: "+91-9876543218" },
  { name: "Neha Verma", email: "neha@example.com", phone: "+91-9876543219" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(emoji, msg) {
  console.log(`  ${emoji}  ${msg}`);
}

function header(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ─── Step 1: Create Event ──────────────────────────────────
async function createEvent() {
  header("STEP 1: Create Event");

  const eventToken = uuidv4().slice(0, 8);
  const result = await pool.query(
    `INSERT INTO events (id, party_name, event_token, event_date, location, guest_count, client_name, client_phone, menu_tier, status, addons_amount, gst_percentage, verify_entries)
     VALUES ($1, $2, $3, $4, $5, $6, 'Sim Client', '1234567890', 'STANDARD', 'BOOKED', 0.00, 18.00, TRUE)
     RETURNING *`,
    [uuidv4(), EVENT_NAME, eventToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "Grand Ballroom, Hotel Singularity", NUM_GUESTS + 5]
  );

  const event = result.rows[0];
  log("✅", `Event created: "${event.party_name}" (ID: ${event.id})`);
  log("🔗", `Event token: ${event.event_token}`);
  log("📅", `Date: ${event.event_date}`);
  log("👥", `Max guests: ${event.guest_count}`);

  return event;
}

// ─── Step 2: Add Guests (inquiry status) ───────────────────
async function addGuests(eventId) {
  header("STEP 2: Add Guests (status: inquiry)");

  const guestIds = [];
  for (const guest of FAKE_GUESTS.slice(0, NUM_GUESTS)) {
    const result = await pool.query(
      `INSERT INTO gm_guests (event_id, name, email, phone, status)
       VALUES ($1, $2, $3, $4, 'inquiry')
       RETURNING id, name, status`,
      [eventId, guest.name, guest.email, guest.phone]
    );
    guestIds.push(result.rows[0].id);
    log("➕", `Added: ${result.rows[0].name} (status: inquiry)`);
  }

  return guestIds;
}

// ─── Step 3: Change status to "booked" (NO QR generation) ──
async function bookGuests(guestIds) {
  header("STEP 3: Change Status → booked (RSVP link only, NO QR)");

  for (const guestId of guestIds) {
    // Update status to booked and add RSVP token
    const rsvpToken = uuidv4();
    await pool.query(
      `UPDATE gm_guests SET status = 'booked', rsvp_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [rsvpToken, guestId]
    );

    const guest = await pool.query("SELECT name FROM gm_guests WHERE id = $1", [guestId]);
    const RSVP_BASE_URL = process.env.RSVP_BASE_URL || "http://localhost:5556/rsvp";
    log("🎫", `Booked: ${guest.rows[0].name} → RSVP link: ${RSVP_BASE_URL}/${rsvpToken} (QR pending verification)`);

    await sleep(100);
  }
}

// ─── Step 4: Simulate RSVP submissions ─────────────────────
async function simulateRSVPs(guestIds) {
  header("STEP 4: Simulate RSVP Submissions (→ rsvp_pending_verification)");

  const dietaryOptions = ["Vegetarian", "Non-Vegetarian", "Vegan", "Gluten-Free", "No Restrictions"];

  for (const guestId of guestIds) {
    const guest = await pool.query(
      "SELECT name, rsvp_token FROM gm_guests WHERE id = $1",
      [guestId]
    );

    const dietary = dietaryOptions[Math.floor(Math.random() * dietaryOptions.length)];
    const plusOnes = Math.floor(Math.random() * 3);

    // Directly update via service (simulating the POST /rsvp/:token flow)
    const result = await rsvpService.submitRSVP(guest.rows[0].rsvp_token, {
      name: guest.rows[0].name,
      dietary_preferences: dietary,
      plus_ones: plusOnes,
      notes: `Looking forward to the event!`,
    });

    log("📝", `RSVP: ${guest.rows[0].name} | Diet: ${dietary} | +${plusOnes} guests | Status: ${result.status}`);
    await sleep(100);
  }
}

// ─── Step 4.5: Simulate Client Verification ────────────────
async function simulateVerification(guestIds) {
  header("STEP 4.5: Client Verifies Guests (Approve → QR Generated)");

  for (const guestId of guestIds) {
    const guest = await pool.query(
      "SELECT name, status FROM gm_guests WHERE id = $1",
      [guestId]
    );

    if (guest.rows[0].status !== "rsvp_pending_verification") {
      log("⏭️", `Skip: ${guest.rows[0].name} (status: ${guest.rows[0].status})`);
      continue;
    }

    // Approve the guest — set verified + generate QR
    await pool.query(
      `UPDATE gm_guests 
       SET status = 'verified', verified = TRUE, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [guestId]
    );

    const qrResult = await qrService.generateQRForGuest(guestId);
    log("✅", `Verified: ${guest.rows[0].name} → QR generated (${qrResult.rsvpUrl})`);

    await sleep(100);
  }
}

// ─── Step 5: Simulate Arrivals + Live Headcount ────────────
async function simulateArrivals(guestIds, eventId) {
  header("STEP 5: Simulate Guest Arrivals (Live Headcount)");

  console.log("");
  log("📊", "Initial headcount:");
  const initial = await headcountService.getHeadcount(eventId);
  log("", `   Expected: ${initial.expected} | Arrived: ${initial.arrived} | Remaining: ${initial.remaining}`);
  console.log("");

  for (let i = 0; i < guestIds.length; i++) {
    const guestId = guestIds[i];
    const guest = await pool.query("SELECT name FROM gm_guests WHERE id = $1", [guestId]);

    try {
      // Use null for wsBroadcast since we're not running the WS server in simulation
      const headcount = await headcountService.recordArrival(guestId, eventId, null, null);

      log(
        "🚶",
        `Arrival ${i + 1}/${guestIds.length}: ${guest.rows[0].name} → ` +
        `${headcount.arrived}/${headcount.expected} (${headcount.percentArrived}%)`
      );
    } catch (err) {
      log("⚠️", `${guest.rows[0].name}: ${err.message}`);
    }

    await sleep(ARRIVAL_DELAY_MS);
  }
}

// ─── Step 6: Show Kitchen Alerts ───────────────────────────
async function showKitchenAlerts(eventId) {
  header("STEP 6: Kitchen Alerts Generated");

  const alerts = await kitchenAlertService.getAlerts(eventId);

  if (alerts.length === 0) {
    log("ℹ️", "No kitchen alerts were triggered.");
    return;
  }

  for (const alert of alerts.reverse()) {
    log("🍽️", `[${alert.percentage_reached}%] ${alert.message}`);
  }
}

// ─── Step 7: Final Summary ─────────────────────────────────
async function showSummary(eventId) {
  header("FINAL SUMMARY");

  const headcount = await headcountService.getHeadcount(eventId);
  const alerts = await kitchenAlertService.getAlerts(eventId);

  console.log("");
  log("📊", `Total Guests:   ${headcount.total}`);
  log("✅", `Expected:       ${headcount.expected}`);
  log("🚶", `Arrived:        ${headcount.arrived}`);
  log("⏳", `Remaining:      ${headcount.remaining}`);
  log("📈", `% Arrived:      ${headcount.percentArrived}%`);
  log("🍽️", `Kitchen Alerts: ${alerts.length}`);
  console.log("");
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log("\n🎯 Guest Management — E2E Simulation");
  console.log("━".repeat(60));

  try {
    // Step 1: Create event
    const event = await createEvent();

    // Step 2: Add guests
    const guestIds = await addGuests(event.id);

    // Step 3: Book guests + generate QR codes
    await bookGuests(guestIds);

    // Step 4: Simulate RSVP submissions
    await simulateRSVPs(guestIds);

    // Step 4.5: Simulate client verification (approve all)
    await simulateVerification(guestIds);

    // Step 5: Simulate arrivals with live headcount
    await simulateArrivals(guestIds, event.id);

    // Step 6: Show kitchen alerts
    await showKitchenAlerts(event.id);

    // Step 7: Final summary
    await showSummary(event.id);

    console.log("🎉 Simulation completed successfully!\n");
  } catch (err) {
    console.error("\n❌ Simulation failed:", err);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

main();
