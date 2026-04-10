import type { Context, Next } from "hono";

/**
 * Auth0 token validation middleware.
 *
 * In production, this would:
 * 1. Extract the Bearer token from the Authorization header
 * 2. Validate the JWT signature against Auth0's JWKS endpoint
 * 3. Check issuer, audience, expiration, and scopes
 * 4. Enforce bounded authority claims (max_purchase_amount)
 *
 * For this demo server, we accept any request and log the headers.
 * Replace with real validation using jose or auth0-node when deploying.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const ucpAgent = c.req.header("UCP-Agent");
  const requestSignature = c.req.header("request-signature");
  const idempotencyKey = c.req.header("idempotency-key");

  // Log UCP-specific headers for visibility
  if (ucpAgent || requestSignature || idempotencyKey) {
    console.log("[Auth] UCP headers:", {
      "UCP-Agent": ucpAgent ?? "(none)",
      "request-signature": requestSignature ? "(present)" : "(none)",
      "idempotency-key": idempotencyKey ?? "(none)",
    });
  }

  if (!authHeader) {
    // In demo mode, allow unauthenticated requests
    console.log("[Auth] No Authorization header - proceeding in demo mode");
    await next();
    return;
  }

  // In production: validate JWT here
  // const token = authHeader.replace("Bearer ", "");
  // const { payload } = await jwtVerify(token, JWKS, { issuer: "https://stylevault.us.auth0.com/", audience: "https://api.stylevault.com" });
  // c.set("tokenPayload", payload);

  console.log("[Auth] Authorization header present - proceeding");
  await next();
}
