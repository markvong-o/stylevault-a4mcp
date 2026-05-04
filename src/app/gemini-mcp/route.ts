import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerGeminiUCPTools } from "@/lib/server/mcp/tools-gemini-ucp";
import { verifyToken, extractBearerToken, buildWwwAuthenticateHeader, toAuthInfo } from "@/lib/server/mcp/auth";
import { eventBus, type McpLogEvent } from "@/lib/server/event-bus";
import { scopeContext, type EventScope } from "@/lib/server/scope-context";

/* ------------------------------------------------------------------ */
/*  Module-level state (survives warm invocations on Vercel)           */
/* ------------------------------------------------------------------ */

const transports: Record<string, WebStandardStreamableHTTPServerTransport> = {};

export function getActiveGeminiSessions(): { active: number; ids: string[] } {
  const ids = Object.keys(transports);
  return { active: ids.length, ids };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "RetailZero UCP-over-MCP", version: "1.0.0" });
  registerGeminiUCPTools(server);
  return server;
}

function getBaseUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

function jsonResponse(status: number, data: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

type PendingEvent = Omit<McpLogEvent, "id" | "timestamp">;

type AuthResult =
  | { kind: "user"; scope: EventScope; authInfo: AuthInfo; events: PendingEvent[] }
  | { kind: "demoRejected"; scope: EventScope; errorResponse: Response; events: PendingEvent[] }
  | { kind: "rejected"; errorResponse: Response };

async function authenticate(req: Request): Promise<AuthResult> {
  const demoSid = req.headers.get("x-demo-session") || undefined;
  const demoScope: EventScope | undefined = demoSid ? { type: "demo", sid: demoSid } : undefined;
  const token = extractBearerToken(req.headers.get("authorization") || undefined);
  const events: PendingEvent[] = [];

  const auth0Domain = process.env.AUTH0_DOMAIN;
  if (!auth0Domain || auth0Domain === "your-tenant.us.auth0.com") {
    return {
      kind: "rejected",
      errorResponse: jsonResponse(500, {
        jsonrpc: "2.0",
        error: { code: -32002, message: "Server misconfigured: AUTH0_DOMAIN is not set." },
        id: null,
      }),
    };
  }

  if (!token) {
    const baseUrl = getBaseUrl(req);
    const wwwAuth = buildWwwAuthenticateHeader(baseUrl);

    events.push({
      type: "auth-challenge",
      result: "info",
      summary: "[UCP-over-MCP] Auth challenge sent -- no Bearer token provided",
      details: {
        method: req.method,
        path: new URL(req.url).pathname,
        responseBody: { status: 401, "WWW-Authenticate": wwwAuth },
      },
    });

    const errorResponse = jsonResponse(401, {
      jsonrpc: "2.0",
      error: { code: -32001, message: "Authentication required" },
      id: null,
    }, { "WWW-Authenticate": wwwAuth });

    if (demoScope) return { kind: "demoRejected", scope: demoScope, errorResponse, events };
    return { kind: "rejected", errorResponse };
  }

  try {
    const tokenInfo = await verifyToken(token);
    const sessionId = req.headers.get("mcp-session-id") || undefined;

    events.push({
      type: "token-verified",
      result: "success",
      summary: `[UCP-over-MCP] Token verified for ${tokenInfo.sub}`,
      details: {
        method: req.method,
        path: new URL(req.url).pathname,
        sessionId,
        scopes: tokenInfo.scopes,
        tokenClaims: tokenInfo.claims as Record<string, unknown>,
      },
    });

    return {
      kind: "user",
      scope: { type: "user", sub: tokenInfo.sub },
      authInfo: toAuthInfo(token, tokenInfo),
      events,
    };
  } catch (err) {
    const baseUrl = getBaseUrl(req);

    events.push({
      type: "token-rejected",
      result: "denied",
      summary: `[UCP-over-MCP] Token rejected: ${(err as Error).message}`,
      details: {
        method: req.method,
        path: new URL(req.url).pathname,
        error: (err as Error).message,
      },
    });

    const errorResponse = jsonResponse(401, {
      jsonrpc: "2.0",
      error: { code: -32001, message: `Invalid token: ${(err as Error).message}` },
      id: null,
    }, { "WWW-Authenticate": buildWwwAuthenticateHeader(baseUrl) });

    if (demoScope) return { kind: "demoRejected", scope: demoScope, errorResponse, events };
    return { kind: "rejected", errorResponse };
  }
}

function replayEvents(events: PendingEvent[]): void {
  for (const e of events) eventBus.push(e);
}

/* ------------------------------------------------------------------ */
/*  Route handlers                                                     */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const startTime = Date.now();
  const auth = await authenticate(request);

  if (auth.kind === "rejected") return auth.errorResponse;
  if (auth.kind === "demoRejected") {
    scopeContext.run(auth.scope, () => replayEvents(auth.events));
    return auth.errorResponse;
  }

  return scopeContext.run(auth.scope, async () => {
    replayEvents(auth.events);

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
            summary: "[UCP-over-MCP] MCP session initialized",
            details: {
              method: "POST",
              path: "/gemini-mcp",
              sessionId: id,
              requestBody: {
                protocolVersion: body?.params?.protocolVersion,
                clientInfo: body?.params?.clientInfo,
              },
              responseBody: { serverInfo: { name: "RetailZero UCP-over-MCP", version: "1.0.0" }, protocolVersion: "2025-03-26" },
              duration: Date.now() - startTime,
            },
          });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          eventBus.push({ type: "session-close", result: "info", summary: "[UCP-over-MCP] MCP session closed", details: { sessionId: transport.sessionId } });
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
        summary: "[UCP-over-MCP] Client requested UCP tool listing",
        details: {
          method: "POST",
          path: "/gemini-mcp",
          sessionId,
          requestBody: { jsonrpc: "2.0", id: rpcId, method: "tools/list" },
          responseBody: {
            tools: ["ucp_discover", "ucp_catalog_search", "ucp_product_details", "ucp_checkout_create", "ucp_checkout_status", "ucp_checkout_complete", "ucp_get_orders"],
          },
          duration: Date.now() - startTime,
        },
      });
    }

    return transport.handleRequest(request, { parsedBody: body, authInfo: auth.authInfo });
  });
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth.kind === "rejected") return auth.errorResponse;
  if (auth.kind === "demoRejected") {
    scopeContext.run(auth.scope, () => replayEvents(auth.events));
    return auth.errorResponse;
  }

  return scopeContext.run(auth.scope, async () => {
    replayEvents(auth.events);

    const sessionId = request.headers.get("mcp-session-id") || undefined;
    if (!sessionId || !transports[sessionId]) {
      return jsonResponse(400, {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
    }

    return transports[sessionId].handleRequest(request, { authInfo: auth.authInfo });
  });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if (auth.kind === "rejected") return auth.errorResponse;

  const scope = auth.scope;

  return scopeContext.run(scope, async () => {
    replayEvents(auth.events);

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
      summary: "[UCP-over-MCP] Client requested session close",
      details: { sessionId, method: "DELETE", path: "/gemini-mcp" },
    });

    return transports[sessionId].handleRequest(request);
  });
}
