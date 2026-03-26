const express = require("express");
const router = express.Router();
const whatsappService = require("../services/whatsappService");

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "intellimanager_2026";

/**
 * GET /whatsapp/webhook — Meta Cloud API verification handshake.
 */
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WhatsApp Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * POST /whatsapp/webhook — Receives messages from WhatsApp users.
 */
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const messageObj = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!messageObj) return res.sendStatus(200); // Status update, not a message

    const phoneNumber = messageObj.from;

    // Extract user message (text or interactive reply)
    let userMessage = "";
    if (messageObj.type === "text") {
      userMessage = messageObj.text.body;
    } else if (messageObj.type === "interactive") {
      const interactive = messageObj.interactive;
      if (interactive.type === "button_reply") {
        userMessage = interactive.button_reply.id;
      } else if (interactive.type === "list_reply") {
        userMessage = interactive.list_reply.id;
      }
    }

    console.log(`[WhatsApp] Received from ${phoneNumber}: ${userMessage}`);

    // Process asynchronously — Meta requires fast 200 OK
    whatsappService.processMessage(phoneNumber, userMessage).catch(err => {
      console.error("[WhatsApp] Processing error:", err.message);
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("[WhatsApp] Webhook error:", err);
    res.sendStatus(500);
  }
});

/**
 * POST /whatsapp/simulate — Local testing endpoint (bypasses Meta format).
 * Body: { "phone": "919876543210", "message": "Hello" }
 */
router.post("/simulate", async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "phone and message required" });
    }

    const result = await whatsappService.processMessage(phone, message);
    res.json({
      status: "processed",
      next_state: result?.next_state || "unknown",
      whatsapp_message: result?.whatsapp_message || null
    });
  } catch (err) {
    console.error("[WhatsApp Simulate] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
