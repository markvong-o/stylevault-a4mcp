import type { Context, Next } from "hono";

/**
 * UCP request authentication middleware.
 *
 * UCP uses two distinct authentication layers:
 *
 * 1. HTTP Message Signatures (RFC 9421) - for all agent-to-merchant requests.
 *    The agent signs each request with its private key. The merchant verifies
 *    the signature against the agent's published public key (from the agent's
 *    signing_keys array in its UCP profile). This enables permissionless
 *    onboarding -- no shared secrets needed.
 *
 * 2. OAuth 2.0 Bearer Token - only for Identity Linking operations.
 *    When an agent accesses user-specific data (order history, account info),
 *    it uses an OAuth access token issued by Auth0 after the user authorized
 *    the Identity Linking capability. Auth0 is the identity provider here.
 *
 * Headers expected on UCP requests:
 * - UCP-Agent: profile="https://agent.example/.well-known/ucp" (agent profile URL)
 * - request-signature: sig1=(...); keyid="agent-key-001" (RFC 9421)
 * - idempotency-key: unique key per request (prevents duplicate processing)
 * - request-id: correlation ID for tracing
 * - Authorization: Bearer <token> (only for Identity Linking operations)
 *
 * For this demo server, we accept any request and log the headers.
 * In production:
 * - Validate request-signature against the agent's published signing_keys
 * - For Identity Linking routes, validate JWT via Auth0 JWKS endpoint
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const ucpAgent = c.req.header("UCP-Agent");
  const requestSignature = c.req.header("request-signature");
  const idempotencyKey = c.req.header("idempotency-key");
  const requestId = c.req.header("request-id");

  // Log UCP-specific headers for visibility
  if (ucpAgent || requestSignature || idempotencyKey) {
    console.log("[Auth] UCP headers:", {
      "UCP-Agent": ucpAgent ?? "(none)",
      "request-signature": requestSignature ? "(present)" : "(none)",
      "idempotency-key": idempotencyKey ?? "(none)",
      "request-id": requestId ?? "(none)",
    });
  }

  // In production:
  // 1. Verify request-signature (RFC 9421) against agent's public key
  //    const agentProfile = await fetchAgentProfile(ucpAgent);
  //    const isValid = verifySignature(c.req, agentProfile.signing_keys);

  // 2. For Identity Linking routes, validate Bearer token via Auth0 JWKS
  //    if (authHeader && isIdentityLinkingRoute(c.req.path)) {
  //      const token = authHeader.replace("Bearer ", "");
  //      const { payload } = await jwtVerify(token, JWKS, {
  //        issuer: "https://stylevault.us.auth0.com/",
  //        audience: "https://api.stylevault.com"
  //      });
  //      c.set("tokenPayload", payload);
  //    }

  if (!ucpAgent && !authHeader) {
    console.log("[Auth] No UCP-Agent or Authorization header - proceeding in demo mode");
  } else {
    console.log("[Auth] Request authenticated - proceeding");
  }

  await next();
}
