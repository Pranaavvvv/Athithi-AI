const express = require("express");
const router = express.Router();
const vapiService = require("../services/vapiService");

/**
 * POST /vapi/tools
 * Vapi AI calls this webhook when the LLM triggers a tool call (function call).
 * Expected Payload Format: 
 * { message: { type: "tool-calls", toolWithToolCallList: [...] } }
 */
router.post("/tools", async (req, res) => {
  try {
    const { message } = req.body;
    
    // Safety check
    if (!message || message.type !== "tool-calls" || !message.toolWithToolCallList) {
      return res.status(400).json({ error: "Invalid Vapi Tool Call payload" });
    }

    // Process all tools in parallel or sequentially (dispatcher handles array)
    const results = await vapiService.handleToolCall(message.toolWithToolCallList);

    // Respond exactly how Vapi expects
    return res.status(200).json({
      results: results
    });

  } catch (err) {
    console.error("[VAPI Tools Router] Error:", err);
    res.status(500).json({ error: "Tool execution failed.", details: err.message });
  }
});

/**
 * POST /vapi/events
 * Vapi AI sends conversation updates and end-of-call reports here.
 * Expected Payload Format:
 * { message: { type: "conversation-update", ... } } OR 
 * { message: { type: "end-of-call-report", ... } }
 */
router.post("/events", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.type) {
      return res.sendStatus(200); // Ignore malformed if not critical
    }

    if (message.type === "end-of-call-report") {
      await vapiService.saveCallReport(message);
    } 
    else if (message.type === "conversation-update") {
      // Optional: Broadcast transcript live if needed
      // const wsManager = require("../guest_management/websocket/wsManager");
      // wsManager.broadcastToChannel("vapi:live_transcript", { transcript: message.transcript });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[VAPI Events Router] Error:", err.message);
    res.sendStatus(500);
  }
});

/**
 * POST /vapi/call/web
 * Creates a Web Call instance on VAPI securely from the backend.
 * Returns the webCallUrl and token so the frontend can connect.
 */
router.post("/call/web", async (req, res) => {
  try {
    const result = await vapiService.initiateWebCall();
    res.status(200).json({ success: true, web_call_details: result });
  } catch (err) {
    console.error("[VAPI Web Call Router] Error:", err.message);
    res.status(500).json({ error: "Failed to initiate VAPI Web call." });
  }
});

module.exports = router;
