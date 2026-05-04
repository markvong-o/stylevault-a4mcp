import { eventBus } from "./event-bus";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
const AUTH0_MCP_CLIENT_ID = process.env.AUTH0_MCP_CLIENT_ID || "";
const AUTH0_MCP_CLIENT_SECRET = process.env.AUTH0_MCP_CLIENT_SECRET || "";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://app.retailzero.mvbuilt.com/api";

export interface TokenExchangeResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Perform an RFC 8693 token exchange.
 *
 * The MCP server (acting as a confidential client) exchanges the agent's
 * broad access token for a narrow, short-lived token scoped to a specific
 * tool operation. This enforces least-privilege per tool call.
 */
export async function exchangeToken(
  subjectToken: string,
  requestedScope: string,
  toolName?: string
): Promise<TokenExchangeResult> {
  if (!AUTH0_DOMAIN || !AUTH0_MCP_CLIENT_ID || !AUTH0_MCP_CLIENT_SECRET) {
    const missing = [
      !AUTH0_DOMAIN && "AUTH0_DOMAIN",
      !AUTH0_MCP_CLIENT_ID && "AUTH0_MCP_CLIENT_ID",
      !AUTH0_MCP_CLIENT_SECRET && "AUTH0_MCP_CLIENT_SECRET",
    ].filter(Boolean).join(", ");

    eventBus.push({
      type: "token-rejected",
      result: "error",
      summary: `Token exchange not configured: missing ${missing}`,
      details: { toolName, scopes: [requestedScope], error: `Missing env vars: ${missing}` },
    });

    throw new Error(`Token exchange not configured: missing ${missing}`);
  }

  const startTime = Date.now();

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: AUTH0_MCP_CLIENT_ID,
    client_secret: AUTH0_MCP_CLIENT_SECRET,
    subject_token: subjectToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    audience: AUTH0_AUDIENCE,
    scope: requestedScope,
  });

  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorBody = await response.text();
    let errorDetail: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorDetail = parsed.error_description || parsed.error || errorBody;
    } catch {
      errorDetail = errorBody;
    }

    eventBus.push({
      type: "token-rejected",
      result: "error",
      summary: `Token exchange failed for scope "${requestedScope}": ${errorDetail}`,
      details: {
        method: "POST",
        path: "/oauth/token",
        toolName,
        scopes: [requestedScope],
        error: errorDetail,
        duration,
      },
    });

    throw new Error(`Token exchange failed (${response.status}): ${errorDetail}`);
  }

  const result: TokenExchangeResult = await response.json();

  eventBus.push({
    type: "token-issued",
    result: "success",
    summary: `Token exchange: ${requestedScope} (${result.expires_in}s TTL)`,
    details: {
      method: "POST",
      path: "/oauth/token",
      toolName,
      scopes: [requestedScope],
      duration,
    },
  });

  return result;
}
