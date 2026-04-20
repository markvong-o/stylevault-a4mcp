import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "node:http";
import { eventBus } from "./event-bus.js";

/**
 * Attach a WebSocket server to the existing HTTP server.
 * Clients connecting to /ws receive:
 *   1. The full event history on connect (so the page loads with context)
 *   2. Each new event as it happens in real-time
 */
export function attachWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    console.log(`[WS] Log viewer connected (${wss.clients.size} total)`);

    // Send history so the page loads with existing events
    const history = eventBus.getHistory();
    if (history.length > 0) {
      ws.send(JSON.stringify({ type: "history", events: history }));
    }

    ws.on("close", () => {
      console.log(`[WS] Log viewer disconnected (${wss.clients.size} total)`);
    });
  });

  // Broadcast every new event to all connected clients
  eventBus.on("mcp-log", (event) => {
    const message = JSON.stringify({ type: "event", event });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });
}
