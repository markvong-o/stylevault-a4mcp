import { eventBus } from "./event-bus";

/**
 * Auth0 Client-Initiated Backchannel Authentication (CIBA) integration.
 *
 * CIBA lets an AI agent request asynchronous, out-of-band user approval
 * for a high-risk action. The flow:
 *
 *   1. Agent calls /bc-authorize with login_hint (user sub), scope,
 *      audience, and binding_message. Auth0 returns auth_req_id.
 *   2. Auth0 pushes a notification to the user's enrolled Guardian device.
 *   3. Agent polls /oauth/token with grant_type
 *      "urn:openid:params:grant-type:ciba" and the auth_req_id.
 *   4. Once approved, Auth0 returns access_token tied to the requested
 *      scope and audience.
 *
 * This module exposes `initiateCiba` and a single-shot `pollCiba` so each
 * Vercel function invocation stays short. The MCP tool layer splits the
 * user experience into `checkout_cart` (initiates) and
 * `complete_ciba_checkout` (polls, finalizes).
 */

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
const CIBA_CLIENT_ID = process.env.AUTH0_CIBA_CLIENT_ID || "";
const CIBA_CLIENT_SECRET = process.env.AUTH0_CIBA_CLIENT_SECRET || "";
const CIBA_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://app.retailzero.mvbuilt.com/api";

function assertConfigured(): void {
  const missing = [
    !AUTH0_DOMAIN && "AUTH0_DOMAIN",
    !CIBA_CLIENT_ID && "AUTH0_CIBA_CLIENT_ID",
    !CIBA_CLIENT_SECRET && "AUTH0_CIBA_CLIENT_SECRET",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`CIBA not configured: missing ${missing.join(", ")}`);
  }
}

export interface CibaInitiateResult {
  auth_req_id: string;
  expires_in: number;
  interval: number;
}

export interface CibaTokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export type CibaPollOutcome =
  | { status: "approved"; tokens: CibaTokenResult }
  | { status: "pending"; recommendedIntervalSeconds: number }
  | { status: "slow_down"; recommendedIntervalSeconds: number }
  | { status: "denied"; reason: string }
  | { status: "expired"; reason: string }
  | { status: "error"; reason: string };

/**
 * Initiate a CIBA authorization request. The user receives a push
 * notification on their Guardian-enrolled device.
 */
export async function initiateCiba(params: {
  login_hint_sub: string;
  scope: string;
  binding_message: string;
  audience?: string;
}): Promise<CibaInitiateResult> {
  assertConfigured();

  const startTime = Date.now();

  // Auth0 expects login_hint as a JSON-serialized JWT-like "format" object
  // when using sub directly. The most interoperable shape is:
  //   { format: "iss_sub", iss: "https://{domain}/", sub: "<user_sub>" }
  const loginHint = JSON.stringify({
    format: "iss_sub",
    iss: `https://${AUTH0_DOMAIN}/`,
    sub: params.login_hint_sub,
  });

  const body = new URLSearchParams({
    client_id: CIBA_CLIENT_ID,
    client_secret: CIBA_CLIENT_SECRET,
    scope: `openid ${params.scope}`.trim(),
    audience: params.audience ?? CIBA_AUDIENCE,
    login_hint: loginHint,
    binding_message: params.binding_message,
  });

  const response = await fetch(`https://${AUTH0_DOMAIN}/bc-authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errText = await response.text();
    eventBus.push({
      type: "ciba-initiate-failed",
      result: "error",
      summary: `CIBA initiation failed (${response.status})`,
      details: {
        method: "POST",
        path: "/bc-authorize",
        error: errText,
        duration,
      },
    });
    throw new Error(`CIBA initiation failed (${response.status}): ${errText}`);
  }

  const json = (await response.json()) as CibaInitiateResult;

  eventBus.push({
    type: "ciba-initiated",
    result: "info",
    summary: `CIBA request sent to user device (auth_req_id=${json.auth_req_id.slice(0, 8)}...)`,
    details: {
      method: "POST",
      path: "/bc-authorize",
      duration,
      responseBody: {
        auth_req_id_prefix: json.auth_req_id.slice(0, 8),
        expires_in: json.expires_in,
        interval: json.interval,
      },
    },
  });

  return json;
}

/**
 * Poll once for CIBA completion. Callers should use the `interval`
 * returned by `initiateCiba` to pace their polls.
 */
export async function pollCiba(authReqId: string): Promise<CibaPollOutcome> {
  assertConfigured();

  const startTime = Date.now();

  const body = new URLSearchParams({
    grant_type: "urn:openid:params:grant-type:ciba",
    client_id: CIBA_CLIENT_ID,
    client_secret: CIBA_CLIENT_SECRET,
    auth_req_id: authReqId,
  });

  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const duration = Date.now() - startTime;
  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (response.ok) {
    eventBus.push({
      type: "ciba-approved",
      result: "success",
      summary: "CIBA approved by user",
      details: { method: "POST", path: "/oauth/token", duration },
    });
    return { status: "approved", tokens: parsed as unknown as CibaTokenResult };
  }

  const errorCode = (parsed.error as string | undefined) || "error";

  if (errorCode === "authorization_pending") {
    return { status: "pending", recommendedIntervalSeconds: 5 };
  }
  if (errorCode === "slow_down") {
    return { status: "slow_down", recommendedIntervalSeconds: 10 };
  }
  if (errorCode === "access_denied") {
    eventBus.push({
      type: "ciba-denied",
      result: "denied",
      summary: "CIBA denied by user",
      details: { method: "POST", path: "/oauth/token", duration, error: errorCode },
    });
    return { status: "denied", reason: (parsed.error_description as string) || "User denied the request." };
  }
  if (errorCode === "expired_token") {
    eventBus.push({
      type: "ciba-expired",
      result: "error",
      summary: "CIBA request expired before user approved",
      details: { method: "POST", path: "/oauth/token", duration, error: errorCode },
    });
    return { status: "expired", reason: "Authorization request expired. Start a new checkout." };
  }

  eventBus.push({
    type: "ciba-error",
    result: "error",
    summary: `CIBA poll error: ${errorCode}`,
    details: { method: "POST", path: "/oauth/token", duration, error: text },
  });

  return {
    status: "error",
    reason: (parsed.error_description as string) || errorCode,
  };
}
