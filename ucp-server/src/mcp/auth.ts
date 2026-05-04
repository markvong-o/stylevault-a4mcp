import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://app.retailzero.mvbuilt.com/api";

export interface TokenInfo {
  sub: string;
  scopes: string[];
  claims: JWTPayload;
}

/**
 * Remote JWKS set for Auth0 token verification.
 * jose caches the keys automatically with sensible TTLs.
 */
const JWKS = createRemoteJWKSet(
  new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`)
);

/**
 * Verify a Bearer token issued by Auth0.
 *
 * Checks:
 * - JWT signature against Auth0's JWKS
 * - Issuer matches the Auth0 tenant
 * - Audience matches our API identifier
 * - Token is not expired
 *
 * Returns the decoded token info or throws on failure.
 */
export async function verifyToken(token: string): Promise<TokenInfo> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${AUTH0_DOMAIN}/`,
    audience: AUTH0_AUDIENCE,
  });

  const scopeString = (payload.scope as string) || "";
  const scopes = scopeString.split(" ").filter(Boolean);

  return {
    sub: payload.sub || "unknown",
    scopes,
    claims: payload,
  };
}

/**
 * Extract Bearer token from an Authorization header value.
 * Returns null if the header is missing or not a Bearer token.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Build the WWW-Authenticate header for a 401 response.
 * Points clients to the Protected Resource Metadata endpoint (RFC 9728)
 * so they can discover Auth0 as the authorization server.
 */
export function buildWwwAuthenticateHeader(baseUrl: string): string {
  return `Bearer realm="retailzero-mcp", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`;
}
