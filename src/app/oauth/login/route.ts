import { type NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { setPkceState, pkceCookieOptions } from "@/lib/server/auth-session";

const AUTH0_DOMAIN = process.env.AUTH0_LOGIN_DOMAIN || process.env.AUTH0_DOMAIN || "";
const AUTH0_MCP_AUDIENCE = process.env.AUTH0_MCP_AUDIENCE || "https://app.retailzero.mvbuilt.com/mcp";
const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Tool-level scopes the agent requests. With enforce_policies=true on the
// MCP Tools API, Auth0 RBAC controls which of these the user actually receives.
// Note: search_products and get_product_details are public (no scope needed).
const TOOL_SCOPES = [
  "tool:get_wishlist",
  "tool:add_to_wishlist",
  "tool:remove_from_wishlist",
  "tool:get_recommendations",
  "tool:get_order_history",
  "tool:update_preferences",
  "tool:add_to_cart",
  "tool:view_cart",
  "tool:update_cart_item",
  "tool:remove_from_cart",
  "tool:clear_cart",
  "tool:checkout_cart",
].join(" ");

export async function GET(request: NextRequest) {
  if (!AUTH0_DOMAIN) {
    return NextResponse.json({ error: "AUTH0_LOGIN_DOMAIN not configured" }, { status: 500 });
  }

  // Accept an optional ?returnTo= that must be a same-origin path. Anything
  // else is silently discarded to prevent open-redirect abuse.
  const rawReturnTo = new URL(request.url).searchParams.get("returnTo");
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : undefined;

  // Generate PKCE code verifier + challenge
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  // Generate random state for CSRF protection
  const state = randomBytes(16).toString("base64url");

  // Encrypt and store PKCE state in a cookie
  const pkceCookie = await setPkceState({ codeVerifier, state, returnTo });

  // CIMD client_id is the metadata document URL
  const clientId = `${BASE_URL}/client-metadata.json`;

  // Request a JWT for the MCP Tools API audience with tool-level scopes.
  // Auth0 issues a JWT whose `aud` is the MCP Tools API and whose `scope`/
  // `permissions` reflect the user's RBAC grants. Per-tool resource access
  // is then handled via OBO token exchange against the Resource API.
  const authUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${BASE_URL}/oauth/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("audience", AUTH0_MCP_AUDIENCE);
  authUrl.searchParams.set("scope", `openid profile email ${TOOL_SCOPES}`);
  authUrl.searchParams.set("prompt", "login");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(pkceCookieOptions(pkceCookie));
  return response;
}
