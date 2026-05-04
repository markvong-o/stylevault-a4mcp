import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type { AuthInfo };

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const AUTH0_MCP_AUDIENCE = process.env.AUTH0_MCP_AUDIENCE || "https://app.retailzero.mvbuilt.com/mcp";

/**
 * JWKS client -- fetches and caches Auth0's public keys for JWT verification.
 */
const JWKS = createRemoteJWKSet(
  new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`)
);

export interface TokenInfo {
  sub: string;
  scopes: string[];
  claims: Record<string, unknown>;
}

/**
 * Build an MCP SDK AuthInfo object from verified token info.
 */
export function toAuthInfo(token: string, info: TokenInfo): AuthInfo {
  return {
    token,
    clientId: (info.claims.azp as string) || info.sub,
    scopes: info.scopes,
    expiresAt: info.claims.exp ? (info.claims.exp as number) * 1000 : undefined,
    extra: {
      sub: info.sub,
      email: info.claims.email,
      ...info.claims,
    },
  };
}

/**
 * Verify a JWT access token against Auth0's JWKS.
 *
 * The token must have been issued for the MCP Tools API audience.
 * Tool-level scopes are extracted from both the `scope` claim (space-
 * separated string) and the `permissions` claim (array, used by Auth0
 * RBAC). Both are merged and deduplicated.
 */
export async function verifyToken(token: string): Promise<TokenInfo> {
  const { payload } = await jwtVerify(token, JWKS, {
    audience: AUTH0_MCP_AUDIENCE,
    issuer: `https://${AUTH0_DOMAIN}/`,
  });

  // Merge scope (space-separated string) and permissions (RBAC array)
  const scopeString = (payload as JWTPayload & { scope?: string }).scope || "";
  const scopeList = scopeString.split(" ").filter(Boolean);
  const permissions = (payload as JWTPayload & { permissions?: string[] }).permissions || [];
  const scopes = [...new Set([...scopeList, ...permissions])];

  return {
    sub: payload.sub || "unknown",
    scopes,
    claims: payload as Record<string, unknown>,
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
 * Points clients to the Protected Resource Metadata endpoint (RFC 9728).
 *
 * Per RFC 9728, the metadata URL for a resource at /mcp is:
 *   /.well-known/oauth-protected-resource/mcp
 */
export function buildWwwAuthenticateHeader(baseUrl: string): string {
  return `Bearer realm="retailzero-mcp", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp"`;
}
