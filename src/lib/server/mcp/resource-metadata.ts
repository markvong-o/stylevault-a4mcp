const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

/**
 * Build the OAuth 2.0 Protected Resource Metadata document (RFC 9728).
 *
 * The `resource` field MUST be the canonical URI of the MCP server,
 * matching what the client connected to. This is also used by the client
 * as the `resource` parameter (RFC 8707) in OAuth requests.
 */
export function protectedResourceMetadata(_request?: Request) {
  const resource = `${BASE_URL}/mcp`;

  return {
    resource,
    authorization_servers: [`https://${AUTH0_DOMAIN}`],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "tool:get_wishlist",
      "tool:add_to_wishlist",
      "tool:remove_from_wishlist",
      "tool:get_recommendations",
      "tool:get_order_history",
      "tool:place_order",
      "tool:update_preferences",
    ],
    bearer_methods_supported: ["header"],
  };
}
