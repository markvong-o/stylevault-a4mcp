import http from "node:http";
import { Readable } from "node:stream";
import next from "next";
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
import { handleGeminiMcpPost, handleGeminiMcpGet, handleGeminiMcpDelete } from "./mcp/server-gemini-ucp.js";
import { eventBus, type McpLogEvent } from "./mcp/event-bus.js";
import { configRoutes } from "./routes/config.js";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
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


  // ── Express app (MCP endpoints only) ───────────────────────────────
  const expressApp = express();

  expressApp.use("/mcp", express.json());
  expressApp.post("/mcp", handleMcpPost);
  expressApp.get("/mcp", handleMcpGet);
  expressApp.delete("/mcp", handleMcpDelete);

  expressApp.use("/gemini-mcp", express.json());
  expressApp.post("/gemini-mcp", handleGeminiMcpPost);
  expressApp.get("/gemini-mcp", handleGeminiMcpGet);
  expressApp.delete("/gemini-mcp", handleGeminiMcpDelete);

  // ── Route-level prefixes for backend API ────────────────────────────
  const backendPrefixes = ["/ucp/", "/.well-known/", "/api/config", "/health"];

  function isBackendRoute(url: string | undefined): boolean {
    if (!url) return false;
    return backendPrefixes.some((p) => url.startsWith(p));
  }

  function isMcpRoute(url: string | undefined): boolean {
    if (!url) return false;
    return url.startsWith("/mcp") || url.startsWith("/gemini-mcp");
  }

  // ── SSE helper (writes directly to Node response, no framework bridge) ──
  async function handleSSE(res: http.ServerResponse) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const write = (event: string, data: string, id?: string) => {
      if (id) res.write(`id: ${id}\n`);
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    };

    // Send retry hint
    write("retry", "3000");

    // Flush persisted history from Redis
    const history = await eventBus.getHistory();
    for (const evt of history) {
      write("history", JSON.stringify(evt), evt.id);
    }
    write("history-done", "");

    // Stream real-time events
    const listener = (evt: McpLogEvent) => {
      write("event", JSON.stringify(evt), evt.id);
    };
    eventBus.on("mcp-log", listener);

    res.on("close", () => {
      eventBus.removeListener("mcp-log", listener);
    });
  }

  // ── Shared HTTP server ──────────────────────────────────────────────
  const server = http.createServer((req, res) => {
    // SSE endpoint -- handled directly, no Hono/Express bridge
    if (req.url === "/api/events/stream" && req.method === "GET") {
      handleSSE(res);
      return;
    }

    // Push a log event from the frontend (for demo security events)
    if (req.url === "/api/events" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const evt = JSON.parse(body);
          eventBus.push(evt);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid json" }));
        }
      });
      return;
    }

    // Clear events
    if (req.url === "/api/events" && req.method === "DELETE") {
      eventBus.clear().then(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ cleared: true }));
      });
      return;
    }

    if (isMcpRoute(req.url)) {
      expressApp(req, res);
    } else if (isBackendRoute(req.url)) {
      // AbortController wired to client disconnect so SSE streams clean up
      const ac = new AbortController();
      res.on("close", () => ac.abort());

      Promise.resolve(
        hono.fetch(
          new Request(`http://localhost:${port}${req.url}`, {
            method: req.method,
            headers: Object.fromEntries(
              Object.entries(req.headers)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v!])
            ),
            body: req.method !== "GET" && req.method !== "HEAD"
              ? Readable.toWeb(req) as ReadableStream
              : undefined,
            // @ts-expect-error duplex is required for streaming request bodies
            duplex: "half",
            signal: ac.signal,
          })
        )
      ).then(async (response: Response) => {
          res.writeHead(
            response.status,
            Object.fromEntries(response.headers.entries())
          );
          if (response.body) {
            const reader = response.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } catch {
              // Client disconnected (abort) -- expected for SSE streams
            }
          }
          if (!res.writableEnded) res.end();
        })
        .catch(() => {
          // Request aborted before Hono could respond
          if (!res.writableEnded) res.end();
        });
    } else {
      nextHandler(req, res);
    }
  });

  // ── Start ───────────────────────────────────────────────────────────
  server.listen(port, () => {
    console.log(`\nStyleVault running on http://localhost:${port}`);
    console.log(`  Mode:               ${dev ? "development" : "production"}`);
    console.log(`  MCP endpoint:       http://localhost:${port}/mcp`);
    console.log(`  Gemini UCP-over-MCP: http://localhost:${port}/gemini-mcp`);
    console.log(`  UCP discovery:      http://localhost:${port}/.well-known/ucp`);
    console.log(`  Config:             http://localhost:${port}/api/config`);
    console.log(`  Event stream:       http://localhost:${port}/api/events/stream`);
    console.log(`  Health:             http://localhost:${port}/health\n`);
  });
});
