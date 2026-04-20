import http from "node:http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import express from "express";
import { wellKnownRoutes } from "./well-known.js";
import { metadataRoutes } from "./mcp/metadata.js";
import { catalogRoutes } from "./catalog.js";
import { checkoutRoutes } from "./checkout.js";
import { orderRoutes } from "./orders.js";
import { authMiddleware } from "./auth.js";
import { handleMcpPost, handleMcpGet, handleMcpDelete } from "./mcp/server.js";
import { attachWebSocket } from "./mcp/ws.js";
import { configRoutes } from "./routes/config.js";

// ── Hono app (UCP routes + well-known endpoints) ──────────────────
const hono = new Hono();

hono.use("*", logger());
hono.use("*", cors());

// Public: discovery + config endpoints (no auth)
hono.route("/", wellKnownRoutes);
hono.route("/", metadataRoutes);
hono.route("/", configRoutes);

// Protected: UCP commerce endpoints
hono.use("/ucp/*", authMiddleware);
hono.route("/", catalogRoutes);
hono.route("/", checkoutRoutes);
hono.route("/", orderRoutes);

// Health check
hono.get("/health", (c) =>
  c.json({ status: "ok", service: "stylevault-server", mcp: true, ucp: true })
);

// ── Express app (MCP endpoint only) ───────────────────────────────
// The MCP SDK's StreamableHTTPServerTransport requires Express-style
// req/res objects. We use Express for just the /mcp path and let Hono
// handle everything else.
const expressApp = express();
expressApp.use("/mcp", express.json());
expressApp.post("/mcp", handleMcpPost);
expressApp.get("/mcp", handleMcpGet);
expressApp.delete("/mcp", handleMcpDelete);

// ── Shared HTTP server ────────────────────────────────────────────
// Route /mcp to Express, everything else to Hono.
const preferredPort = parseInt(process.env.PORT ?? "3001", 10);
const MAX_PORT_RETRIES = 10;

const server = http.createServer((req, res) => {
  const actualPort = (server.address() as { port: number })?.port ?? preferredPort;
  if (req.url?.startsWith("/mcp")) {
    expressApp(req, res);
  } else {
    hono.fetch(
      new Request(`http://localhost:${actualPort}${req.url}`, {
        method: req.method,
        headers: Object.fromEntries(
          Object.entries(req.headers)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v!])
        ),
        body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
        // @ts-expect-error duplex is required for streaming request bodies
        duplex: "half",
      })
    ).then(async (response) => {
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          await pump();
        };
        await pump();
      } else {
        res.end();
      }
    });
  }
});

// ── WebSocket for live log view ───────────────────────────────────
attachWebSocket(server);

// ── Start with automatic port retry ──────────────────────────────
function printStartup(port: number) {
  console.log(`\nStyleVault Server running on port ${port}`);
  console.log(`\n  MCP endpoint:       http://localhost:${port}/mcp`);
  console.log(`  MCP metadata:       http://localhost:${port}/.well-known/oauth-protected-resource`);
  console.log(`  Log viewer WS:      ws://localhost:${port}/ws`);
  console.log(`  UCP discovery:      http://localhost:${port}/.well-known/ucp`);
  console.log(`  Catalog:            http://localhost:${port}/ucp/v1/catalog/search`);
  console.log(`  Checkout:           http://localhost:${port}/ucp/v1/checkout/sessions`);
  console.log(`  Orders:             http://localhost:${port}/ucp/v1/orders`);
  console.log(`  Health:             http://localhost:${port}/health`);
  console.log(`  Config:             http://localhost:${port}/api/config\n`);
}

function listen(port: number, attempt: number) {
  server.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attempt < MAX_PORT_RETRIES) {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      listen(port + 1, attempt + 1);
    } else {
      console.error(`Failed to start server: ${err.message}`);
      process.exit(1);
    }
  });

  server.listen(port, () => printStartup(port));
}

listen(preferredPort, 0);
