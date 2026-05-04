import { Hono } from "hono";
import { eventBus } from "./event-bus.js";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://app.retailzero.mvbuilt.com/api";

const app = new Hono();

/**
 * RFC 9728 - Protected Resource Metadata
 *
 * This is the starting point for the MCP OAuth flow. When a client (ChatGPT,
 * Claude, etc.) first connects to the MCP endpoint and receives a 401, it
 * fetches this metadata to discover:
 *   1. Which authorization server to use (Auth0)
 *   2. What scopes are available
 *   3. How to present bearer tokens
 *
 * The client then fetches Auth0's /.well-known/openid-configuration to get
 * the authorization and token endpoints, performs DCR or uses pre-registered
 * credentials, and walks the user through the OAuth consent flow.
 */
app.get("/.well-known/oauth-protected-resource", (c) => {
  const userAgent = c.req.header("user-agent") || "unknown";

  eventBus.push({
    type: "metadata-fetch",
    result: "info",
    summary: "Protected Resource Metadata requested (RFC 9728)",
    details: {
      method: "GET",
      path: "/.well-known/oauth-protected-resource",
      headers: { "user-agent": userAgent },
      responseBody: {
        resource: AUTH0_AUDIENCE,
        authorization_servers: [`https://${AUTH0_DOMAIN}`],
        scopes_supported: [
          "read:products", "read:wishlist", "read:orders",
          "write:preferences", "execute:purchase",
        ],
      },
    },
  });

  return c.json({
    resource: AUTH0_AUDIENCE,
    authorization_servers: [`https://${AUTH0_DOMAIN}`],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "read:products",
      "read:wishlist",
      "read:orders",
      "write:preferences",
      "execute:purchase",
    ],
    bearer_methods_supported: ["header"],
  });
});

export { app as metadataRoutes };
