# StyleVault MCP Server -- What's Left to Do

This document covers everything that still needs to happen before the MCP server is fully operational with Auth0 and ChatGPT connected end-to-end.

---

## 1. Auth0 Tenant Configuration

The MCP server code is ready, but the Auth0 side needs to be set up manually in the Dashboard.

### Create the API

- [ ] Go to **Applications > APIs > Create API**
- [ ] Set identifier to `https://api.stylevault.com`
- [ ] Use RS256 signing algorithm

### Add Scopes to the API

- [ ] `read:products` -- Search and view product catalog
- [ ] `read:wishlist` -- View saved wishlist items
- [ ] `read:orders` -- View order history
- [ ] `write:preferences` -- Update style preferences
- [ ] `execute:purchase` -- Place orders (server enforces $250 limit)

### Create an Application for the MCP Server

- [ ] Create a Machine-to-Machine application named `StyleVault MCP Server`
- [ ] Authorize it for the `StyleVault API`
- [ ] Copy the Client ID into `.env`

### Enable Dynamic Client Registration

ChatGPT needs to register itself as an OAuth client on first connection.

- [ ] Go to **Settings > Advanced > OIDC Discovery**
- [ ] Enable OIDC Dynamic Client Registration
- [ ] Alternatively, pre-register a client for ChatGPT with the correct callback URL

### Create a Test User

- [ ] Create user `alex@example.com` in **User Management > Users** (matches seed data for wishlist, orders, preferences)

---

## 2. Environment Variables

- [ ] Copy `ucp-server/.env.example` to `ucp-server/.env`
- [ ] Set `AUTH0_DOMAIN` to your actual tenant (e.g., `stylevault.us.auth0.com`)
- [ ] Set `AUTH0_AUDIENCE` to `https://api.stylevault.com`

Until this is done, the server runs in **demo mode** (no authentication required, no OAuth flow).

---

## 3. Expose the Server to the Internet

ChatGPT can only connect to HTTPS endpoints on the public internet.

- [ ] Choose a tunneling or hosting approach:
  - **ngrok:** `ngrok http 3001` (quickest for testing)
  - **Cloudflare Tunnel:** `cloudflared tunnel --url http://localhost:3001`
  - **Cloud deploy:** Railway, Render, Fly.io, or similar
- [ ] Note the public HTTPS URL (you'll need it for Auth0 callback URLs and ChatGPT)

### Update Auth0 with the Public URL

- [ ] Add `https://<your-domain>/callback` to the application's **Allowed Callback URLs**
- [ ] Add `https://<your-domain>` to **Allowed Web Origins**
- [ ] If using DCR, ensure the default client template includes these URLs

---

## 4. Connect ChatGPT

- [ ] Open ChatGPT > Settings > Connectors
- [ ] Add custom connector with URL: `https://<your-domain>/mcp`
- [ ] Complete the Auth0 login and consent flow when prompted
- [ ] Verify all 6 tools appear in the connector settings

---

## 5. Validate End-to-End

Test each tool through ChatGPT to confirm the full chain works:

- [ ] `search_products` -- "Search for leather bags under $300"
- [ ] `get_product_details` -- "Tell me about the Heritage Duffle"
- [ ] `get_wishlist` -- "Show me my wishlist"
- [ ] `get_order_history` -- "What are my recent orders?"
- [ ] `place_order` (under $250) -- "Order the Compact Travel Satchel"
- [ ] `place_order` (over $250, should fail) -- "Buy the Meridian Automatic Watch"
- [ ] `update_preferences` -- "Add 'leather bags' to my preferences"

---

## 6. Optional Enhancements (Not Blocking, But Worth Doing)

These aren't required to get the server running, but they strengthen the demo and move it closer to production quality.

### Auth0 Actions for Custom Claims

- [ ] Create a post-login Action that adds `max_purchase_amount` as a custom claim in the access token
- [ ] Update the MCP server to read the bounded authority limit from the token instead of the hard-coded $250

### Auth0 CIBA for Escalation

- [ ] Enable CIBA (Client-Initiated Backchannel Authentication) on the Auth0 tenant
- [ ] Add an escalation flow to `place_order` so purchases above the limit trigger a push notification to the buyer for approval instead of a hard rejection

### Scope Enforcement in Tools

- [ ] Currently the tools check `authInfo` for user email but don't enforce individual scopes per tool call. Wire scope checking into each tool handler so that, for example, calling `place_order` without the `execute:purchase` scope returns a clear permission error.

### Persistent Storage

- [ ] Replace in-memory Maps (orders, wishlists, preferences) with a database (SQLite for dev, PostgreSQL for production) so data survives server restarts

### MCP Inspector Testing

- [ ] Install MCP Inspector: `npx @modelcontextprotocol/inspector`
- [ ] Connect to `http://localhost:3001/mcp` and test tools interactively (useful for debugging without ChatGPT in the loop)

---

## Quick Reference: What's Already Done

| Component | Status |
|-----------|--------|
| MCP server with Streamable HTTP transport | Done |
| 6 MCP tools (search, details, wishlist, orders, purchase, preferences) | Done |
| Protected Resource Metadata endpoint (RFC 9728) | Done |
| Auth0 JWT verification middleware (jose) | Done |
| Demo mode fallback (no auth required) | Done |
| Bounded authority enforcement ($250 limit) | Done |
| Seed data (products, wishlists, preferences, orders) | Done |
| ChatGPT setup guide | Done |
| UCP routes preserved and unaffected | Done |
