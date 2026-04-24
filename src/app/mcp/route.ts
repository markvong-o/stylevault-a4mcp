import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerTools } from "@/lib/server/mcp/tools";
import { verifyToken, extractBearerToken, buildWwwAuthenticateHeader, toAuthInfo } from "@/lib/server/mcp/auth";
import { eventBus } from "@/lib/server/event-bus";

/* ------------------------------------------------------------------ */
/*  Module-level state (survives warm invocations on Vercel)           */
/* ------------------------------------------------------------------ */

const transports: Record<string, WebStandardStreamableHTTPServerTransport> = {};

export function getActiveSessions(): { active: number; ids: string[] } {
  const ids = Object.keys(transports);
  return { active: ids.length, ids };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "RetailZero", version: "1.0.0" });
  registerTools(server);
  return server;
}

function getBaseUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(status: number, data: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...headers },
  });
}

function withCors(response: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get("authorization") || undefined;
  const token = extractBearerToken(authHeader);

  const auth0Domain = process.env.AUTH0_DOMAIN;
  if (!auth0Domain || auth0Domain === "your-tenant.us.auth0.com") {
    return { authInfo: toAuthInfo("anonymous", { sub: "anonymous", scopes: [], claims: {} }) };
  }

  if (!token) {
    const baseUrl = getBaseUrl(req);
    const wwwAuth = buildWwwAuthenticateHeader(baseUrl);

    eventBus.push({
      type: "auth-challenge",
      result: "info",
      summary: "Auth challenge sent -- no Bearer token provided",
      details: {
        method: req.method,
        path: new URL(req.url).pathname,
        responseBody: { status: 401, "WWW-Authenticate": wwwAuth },
      },
    });

    return {
      errorResponse: jsonResponse(401, {
        jsonrpc: "2.0",
        error: { code: -32001, message: "Authentication required" },
        id: null,
      }, { "WWW-Authenticate": wwwAuth }),
    };
  }

  try {
    const tokenInfo = await verifyToken(token);
    const sessionId = req.headers.get("mcp-session-id") || undefined;

    eventBus.push({
      type: "token-verified",
      result: "success",
      summary: `Token verified for ${tokenInfo.sub}`,
      details: {
        method: req.method,
        path: new URL(req.url).pathname,
        sessionId,
        scopes: tokenInfo.scopes,
        tokenClaims: tokenInfo.claims as Record<string, unknown>,
      },
    });

    return { authInfo: toAuthInfo(token, tokenInfo) };
  } catch (err) {
    const baseUrl = getBaseUrl(req);

    eventBus.push({
      type: "token-rejected",
      result: "denied",
      summary: `Token rejected: ${(err as Error).message}`,
      details: {
        method: req.method,
        path: new URL(req.url).pathname,
        error: (err as Error).message,
      },
    });

    return {
      errorResponse: jsonResponse(401, {
        jsonrpc: "2.0",
        error: { code: -32001, message: `Invalid token: ${(err as Error).message}` },
        id: null,
      }, { "WWW-Authenticate": buildWwwAuthenticateHeader(baseUrl) }),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Route handlers                                                     */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const startTime = Date.now();
  const auth = await authenticate(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  const sessionId = request.headers.get("mcp-session-id") || undefined;
  let transport: WebStandardStreamableHTTPServerTransport;

  const body = await request.json();
  const rpcMethod: string | undefined = body?.method;
  const rpcId = body?.id;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(body)) {
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (id) => {
        transports[id] = transport;
        eventBus.push({
          type: "session-init",
          result: "success",
          summary: "MCP session initialized",
          details: {
            method: "POST",
            path: "/mcp",
            sessionId: id,
            requestBody: {
              protocolVersion: body?.params?.protocolVersion,
              clientInfo: body?.params?.clientInfo,
            },
            responseBody: { serverInfo: { name: "RetailZero", version: "1.0.0" }, protocolVersion: "2025-03-26" },
            duration: Date.now() - startTime,
          },
        });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        eventBus.push({ type: "session-close", result: "info", summary: "MCP session closed", details: { sessionId: transport.sessionId } });
        delete transports[transport.sessionId];
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    return jsonResponse(400, {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null,
    });
  }

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
          tools: ["search_products", "get_product_details", "get_wishlist", "add_to_wishlist", "remove_from_wishlist", "get_recommendations", "get_order_history", "place_order", "update_preferences"],
        },
        duration: Date.now() - startTime,
      },
    });
  }

  return withCors(await transport.handleRequest(request, { parsedBody: body, authInfo: auth.authInfo }));
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  const sessionId = request.headers.get("mcp-session-id") || undefined;
  if (!sessionId || !transports[sessionId]) {
    return jsonResponse(400, {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session ID" },
      id: null,
    });
  }

  return withCors(await transports[sessionId].handleRequest(request, { authInfo: auth.authInfo }));
}

export async function DELETE(request: Request) {
  const sessionId = request.headers.get("mcp-session-id") || undefined;
  if (!sessionId || !transports[sessionId]) {
    return jsonResponse(400, {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session ID" },
      id: null,
    });
  }

  eventBus.push({
    type: "session-close",
    result: "info",
    summary: "Client requested session close",
    details: { sessionId, method: "DELETE", path: "/mcp" },
  });

  return withCors(await transports[sessionId].handleRequest(request));
}
