/**
 * WebSocket Manager
 * Manages WebSocket connections grouped by channel (e.g. "kitchen:{eventId}", "headcount:{eventId}").
 * Provides broadcast and send utilities.
 */

const WebSocket = require("ws");

class WSManager {
  constructor() {
    /** @type {Map<string, Set<WebSocket>>} channel -> set of clients */
    this.channels = new Map();
    this.wss = null;
  }

  /**
   * Initialize WebSocket server and attach to an HTTP server.
   * @param {import("http").Server} httpServer
   */
  init(httpServer) {
    this.wss = new WebSocket.Server({ server: httpServer });

    this.wss.on('error', (err) => {
      console.error('[WSS] Internal Server Error:', err);
    });

    this.wss.on("connection", (ws, req) => {
      let channel = "general";
      try {
        const host = req.headers.host || "localhost";
        const url = new URL(req.url, `http://${host}`);
        channel = url.searchParams.get("channel") || "general";
      } catch (e) {
        console.error("[WS] Error parsing connection URL:", e.message);
      }

      console.log(`[WS] Client attempting connection to channel: ${channel}`);
      this.subscribe(ws, channel);
      console.log(`[WS] Client connected to channel: ${channel} (total: ${this._channelSize(channel)})`);

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          // Allow dynamic channel switching
          if (data.action === "subscribe" && data.channel) {
            this.subscribe(ws, data.channel);
            ws.send(JSON.stringify({ type: "subscribed", channel: data.channel }));
          }
        } catch (e) {
          // Not JSON, ignore
        }
      });

      ws.on("close", () => {
        this.unsubscribeAll(ws);
        console.log(`[WS] Client disconnected from channel: ${channel}`);
      });

      ws.on("error", (err) => {
        console.error(`[WS] Error:`, err.message);
        this.unsubscribeAll(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        channel,
        message: `Connected to ${channel}`,
      }));
    });

    console.log("[WS] WebSocket server initialized");
  }

  /**
   * Subscribe a client to a channel.
   */
  subscribe(ws, channel) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(ws);
  }

  /**
   * Remove a client from all channels.
   */
  unsubscribeAll(ws) {
    for (const [, clients] of this.channels) {
      clients.delete(ws);
    }
  }

  /**
   * Broadcast a message to all clients in a channel.
   * @param {string} channel
   * @param {Object} data
   */
  broadcast(channel, data) {
    const clients = this.channels.get(channel);
    if (!clients || clients.size === 0) return;

    const payload = JSON.stringify(data);
    let sent = 0;

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sent++;
      }
    }

    console.log(`[WS] Broadcast to ${channel}: ${sent} client(s)`);
  }

  /**
   * Get a broadcast function suitable for passing to services.
   * Usage: const wsBroadcast = wsManager.getBroadcaster();
   *        wsBroadcast("kitchen:eventId123", { type: "alert", ... });
   */
  getBroadcaster() {
    return (channel, data) => this.broadcast(channel, data);
  }

  _channelSize(channel) {
    return this.channels.has(channel) ? this.channels.get(channel).size : 0;
  }
}

// Singleton
const wsManager = new WSManager();
module.exports = wsManager;
