import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { registerTools } from "./tools.js";
import { verifyToken, extractBearerToken, buildWwwAuthenticateHeader } from "./auth.js";
import { eventBus } from "./event-bus.js";

/**
 * Active MCP sessions indexed by session ID.
 * Each session gets its own McpServer + StreamableHTTPServerTransport pair.
 */
const transports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Return a snapshot of active MCP sessions.
 */
export function getActiveSessions(): { active: number; ids: string[] } {
  const ids = Object.keys(transports);
  return { active: ids.length, ids };
}

/**
 * Create a fresh McpServer instance with all StyleVault tools registered.
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "StyleVault",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}

/**
 * Sanitize headers for logging (redact Authorization value).
 */
function safeHeaders(req: Request): Record<string, string> {
  const h: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (!val) continue;
    const v = Array.isArray(val) ? val.join(", ") : val;
    h[key] = key.toLowerCase() === "authorization" ? `Bearer ***${v.slice(-8)}` : v;
  }
  return h;
}

/**
 * Authenticate the request using Auth0 JWT.
 * Returns true on success, or sends a 401 and returns false.
 */
async function authenticate(req: Request, res: Response): Promise<boolean> {
  const token = extractBearerToken(req.headers.authorization);

  // If no Auth0 domain is configured, skip auth (demo mode)
  const auth0Domain = process.env.AUTH0_DOMAIN;
  if (!auth0Domain || auth0Domain === "your-tenant.us.auth0.com") {
    return true;
  }

  if (!token) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const wwwAuth = buildWwwAuthenticateHeader(baseUrl);
    res.status(401).setHeader("WWW-Authenticate", wwwAuth);
    res.json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Authentication required" },
      id: null,
    });

    eventBus.push({
      type: "auth-challenge",
      result: "info",
      summary: "Auth challenge sent -- no Bearer token provided",
      details: {
        method: req.method,
        path: req.path,
        headers: safeHeaders(req),
        responseBody: { status: 401, "WWW-Authenticate": wwwAuth },
      },
    });

    return false;
  }

  try {
    const tokenInfo = await verifyToken(token);

    eventBus.push({
      type: "token-verified",
      result: "success",
      summary: `Token verified for ${tokenInfo.sub}`,
      details: {
        method: req.method,
        path: req.path,
        sessionId: req.headers["mcp-session-id"] as string | undefined,
        scopes: tokenInfo.scopes,
        tokenClaims: tokenInfo.claims as Record<string, unknown>,
      },
    });

    return true;
  } catch (err) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.status(401).setHeader("WWW-Authenticate", buildWwwAuthenticateHeader(baseUrl));
    res.json({
      jsonrpc: "2.0",
      error: { code: -32001, message: `Invalid token: ${(err as Error).message}` },
      id: null,
    });

    eventBus.push({
      type: "token-rejected",
      result: "denied",
      summary: `Token rejected: ${(err as Error).message}`,
      details: {
        method: req.method,
        path: req.path,
        error: (err as Error).message,
      },
    });

    return false;
  }
}

/**
 * Handle POST /mcp - JSON-RPC requests and session initialization.
 */
export async function handleMcpPost(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const authed = await authenticate(req, res);
  if (!authed) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  // Identify the JSON-RPC method for logging
  const body = req.body;
  const rpcMethod: string | undefined = body?.method;
  const rpcId = body?.id;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(body)) {
    // New session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = transport;

        eventBus.push({
          type: "session-init",
          result: "success",
          summary: `MCP session initialized`,
          details: {
            method: "POST",
            path: "/mcp",
            sessionId: id,
            requestBody: {
              protocolVersion: body?.params?.protocolVersion,
              clientInfo: body?.params?.clientInfo,
            },
            responseBody: {
              serverInfo: { name: "StyleVault", version: "1.0.0" },
              protocolVersion: "2025-03-26",
            },
            duration: Date.now() - startTime,
          },
        });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        eventBus.push({
          type: "session-close",
          result: "info",
          summary: `MCP session closed`,
          details: { sessionId: transport.sessionId },
        });
        delete transports[transport.sessionId];
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null,
    });
    return;
  }

  // Emit events for tools/list and tools/call before handling
  if (rpcMethod === "tools/list") {
    eventBus.push({
      type: "tool-list",
      result: "success",
      summary: "Client requested tool listing",
      details: {
        method: "POST",
        path: "/mcp",
        sessionId,
        requestBody: { jsonrpc: "2.0", id: rpcId, method: "tools/list" },
        responseBody: {
          tools: [
            "search_products",
            "get_product_details",
            "get_wishlist",
            "get_order_history",
            "place_order",
            "update_preferences",
          ],
        },
        duration: Date.now() - startTime,
      },
    });
  }

  // tool-call/tool-result events are emitted from within the tool handlers (tools.ts)

  await transport.handleRequest(req, res, body);
}

/**
 * Handle GET /mcp - SSE stream for server-to-client notifications.
 */
export async function handleMcpGet(req: Request, res: Response): Promise<void> {
  const authed = await authenticate(req, res);
  if (!authed) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session ID" },
      id: null,
    });
    return;
  }

  await transports[sessionId].handleRequest(req, res);
}

/**
 * Handle DELETE /mcp - Session cleanup.
 */
export async function handleMcpDelete(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session ID" },
      id: null,
    });
    return;
  }

  eventBus.push({
    type: "session-close",
    result: "info",
    summary: "Client requested session close",
    details: { sessionId, method: "DELETE", path: "/mcp" },
  });

  await transports[sessionId].handleRequest(req, res);
}
