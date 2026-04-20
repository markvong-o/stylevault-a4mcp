# Connecting ChatGPT to StyleVault via MCP + Auth0

This guide walks through setting up the StyleVault MCP server, configuring Auth0 as the authorization server, and connecting ChatGPT so it can search products, view wishlists, and place orders on behalf of your users.

By the end, you'll have a working integration where ChatGPT authenticates users through Auth0, receives scoped access tokens, and calls StyleVault tools with bounded authority enforcement.

---

## Architecture Overview

```
ChatGPT                     Auth0                      StyleVault MCP Server
  |                           |                              |
  |-- POST /mcp ------------->|                              |
  |<-- 401 + WWW-Authenticate |                              |
  |                           |                              |
  |-- GET /.well-known/oauth-protected-resource ------------>|
  |<-- { authorization_servers: [Auth0], scopes_supported }--|
  |                           |                              |
  |-- GET /.well-known/openid-configuration -->|             |
  |<-- { authorization_endpoint, token_endpoint }            |
  |                           |                              |
  |-- /authorize (user login + consent) ----->|              |
  |<-- authorization_code ----|              |               |
  |-- POST /oauth/token ----->|              |               |
  |<-- access_token ----------|              |               |
  |                           |                              |
  |-- POST /mcp + Bearer token ----------------------------->|
  |<-- tool results ----------------------------------------|
```

**Key standards in play:**
- RFC 9728 (Protected Resource Metadata) - tells ChatGPT where to authenticate
- RFC 8414 (Authorization Server Metadata) - tells ChatGPT how to authenticate
- OAuth 2.1 with PKCE - the actual auth flow
- MCP Streamable HTTP Transport - the protocol ChatGPT speaks

---

## Prerequisites

- Node.js 18+
- An Auth0 account ([sign up free](https://auth0.com/signup))
- A ChatGPT Plus/Team/Enterprise account (MCP connectors require a paid plan)
- A way to expose localhost to the internet (ngrok, Cloudflare Tunnel, or a cloud deployment)

---

## Part 1: Auth0 Tenant Setup

### 1.1 Create an API

1. Go to **Auth0 Dashboard > Applications > APIs**
2. Click **Create API**
3. Fill in:
   - **Name:** `StyleVault API`
   - **Identifier:** `https://api.stylevault.com`
   - **Signing Algorithm:** RS256
4. Click **Create**

### 1.2 Define Scopes

On the API's **Permissions** tab, add these scopes:

| Scope | Description |
|-------|-------------|
| `read:products` | Search and view product catalog |
| `read:wishlist` | View saved wishlist items |
| `read:orders` | View order history |
| `write:preferences` | Update style preferences |
| `execute:purchase` | Place orders (up to $250 limit) |

### 1.3 Create a Machine-to-Machine Application (for the MCP server)

1. Go to **Applications > Applications**
2. Click **Create Application**
3. Choose **Machine to Machine Applications**
4. Name it `StyleVault MCP Server`
5. Authorize it for the `StyleVault API`
6. Note the **Client ID** -- you'll need this for the `.env` file

### 1.4 Enable Dynamic Client Registration (DCR)

ChatGPT needs to register itself as an OAuth client when it first connects. Auth0 supports this via OIDC Dynamic Client Registration:

1. Go to **Auth0 Dashboard > Settings > Advanced**
2. Under **OIDC Discovery**, enable **OIDC Dynamic Client Registration**
3. Set the default directory for new clients

> **Alternative:** If you prefer not to enable DCR, you can pre-register a client for ChatGPT. Create a Regular Web Application, set the callback URL to `https://chatgpt.com/aip/g-*/oauth/callback` (or the callback URL ChatGPT provides), and configure the client credentials in ChatGPT's connector settings.

### 1.5 Configure Universal Login

1. Go to **Branding > Universal Login**
2. Ensure **New Universal Login** is selected (the modern, customizable experience)
3. Optionally customize the login page with StyleVault branding

### 1.6 Add a Test User

1. Go to **User Management > Users**
2. Click **Create User**
3. Create a user with email `alex@example.com` (matches the demo seed data)
4. Set a password

---

## Part 2: Configure and Run the MCP Server

### 2.1 Install Dependencies

```bash
cd ucp-server
npm install
```

### 2.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Auth0 values:

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.stylevault.com
PORT=3001
```

> **Demo mode:** If you leave `AUTH0_DOMAIN` as `your-tenant.us.auth0.com`, the server runs in demo mode with no authentication required. This is useful for local testing but won't work with ChatGPT's OAuth flow.

### 2.3 Start the Server

```bash
npm run dev
```

You should see:

```
StyleVault Server running on port 3001

  MCP endpoint:       http://localhost:3001/mcp
  MCP metadata:       http://localhost:3001/.well-known/oauth-protected-resource
  UCP discovery:      http://localhost:3001/.well-known/ucp
  ...
```

### 2.4 Verify Endpoints

```bash
# Protected Resource Metadata (RFC 9728)
curl http://localhost:3001/.well-known/oauth-protected-resource

# Health check
curl http://localhost:3001/health

# MCP endpoint (should return 401 when Auth0 is configured)
curl -X POST http://localhost:3001/mcp -H "Content-Type: application/json" -d '{}'
```

---

## Part 3: Expose to the Internet

ChatGPT needs to reach your MCP server over HTTPS. Choose one of these approaches:

### Option A: ngrok (quickest for testing)

```bash
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`).

**Important:** Add the ngrok URL to your Auth0 application's allowed callback URLs:
1. Go to your Auth0 Application > Settings
2. Add `https://abc123.ngrok-free.app/callback` to **Allowed Callback URLs**
3. Add `https://abc123.ngrok-free.app` to **Allowed Web Origins**

### Option B: Cloudflare Tunnel (more stable)

```bash
cloudflared tunnel --url http://localhost:3001
```

### Option C: Deploy to a cloud provider

Deploy the `ucp-server/` directory to Railway, Render, Fly.io, or any Node.js hosting platform. Set the environment variables in the hosting dashboard.

---

## Part 4: Connect ChatGPT to the MCP Server

### 4.1 Open ChatGPT Settings

1. Go to [chatgpt.com](https://chatgpt.com)
2. Click your profile icon (bottom-left)
3. Click **Settings**

### 4.2 Add a Connector

1. Navigate to **Connectors** (or **Tools** depending on your ChatGPT plan)
2. Scroll to **Add custom connector** (or **Add MCP Server**)
3. Enter the MCP server URL:
   ```
   https://your-domain.com/mcp
   ```
   Replace with your ngrok/tunnel/deployed URL.
4. Click **Add**

### 4.3 Authenticate

ChatGPT will initiate the OAuth flow:

1. **401 Challenge** -- ChatGPT hits `/mcp` and receives a 401 with the `WWW-Authenticate` header pointing to `/.well-known/oauth-protected-resource`
2. **Discovery** -- ChatGPT fetches the protected resource metadata, finds Auth0 as the authorization server, and fetches Auth0's `/.well-known/openid-configuration`
3. **Authorization** -- ChatGPT opens a browser window to Auth0's Universal Login
4. **User Login** -- You log in with the test user credentials (alex@example.com)
5. **Consent** -- Auth0 shows the consent screen with the requested scopes
6. **Token Exchange** -- After consent, ChatGPT receives an access token

Once authenticated, you'll see the StyleVault tools appear in ChatGPT.

### 4.4 Configure Tool Permissions

Back in ChatGPT settings, click the StyleVault connector to see the available tools:

- **search_products** -- Search the catalog
- **get_product_details** -- Get full product info
- **get_wishlist** -- View saved items
- **get_order_history** -- View past orders
- **place_order** -- Purchase products (up to $250)
- **update_preferences** -- Update style preferences

Enable or disable tools as needed.

---

## Part 5: Test the Integration

Start a new conversation in ChatGPT and try these prompts:

### Search the catalog

> "Search StyleVault for leather bags under $300"

ChatGPT should call `search_products` and return results like:
- City Tote -- $199
- Compact Travel Satchel -- $149
- Heritage Duffle -- $269

### View your wishlist

> "Show me my StyleVault wishlist"

ChatGPT should call `get_wishlist` and return 4 items including the Cashmere Wrap Scarf, Blue Denim Jacket, Leather Weekender Bag, and Meridian Automatic Watch.

### Place an order (within limit)

> "Order the Compact Travel Satchel from StyleVault"

ChatGPT should call `place_order` with `product_id: "bag_satchel_001"` and receive a confirmed order at $149.

### Bounded authority enforcement

> "Buy the Meridian Automatic Watch"

ChatGPT should call `place_order` and receive a `bounded_authority_exceeded` error because $2,400 exceeds the $250 agent transaction limit. ChatGPT will explain that this purchase requires direct buyer approval.

### Update preferences

> "Add 'leather bags' and 'weekend travel' to my StyleVault preferences"

ChatGPT should call `update_preferences` and confirm the preferences were added.

---

## How It Works: The Security Model

### Token Scopes

Each MCP tool maps to an OAuth scope. Auth0 issues access tokens with only the scopes the user consented to. If a user denied the `execute:purchase` scope during consent, the `place_order` tool would fail with a permission error.

### Bounded Authority

The $250 per-transaction limit is a server-side merchant policy, not a token claim. Even with a valid `execute:purchase` scope, the MCP server enforces this ceiling. Purchases above $250 require direct buyer approval (which would use Auth0 CIBA in a production setup).

This separation matters: the scope grants the *capability* to purchase, while bounded authority limits the *magnitude*. Together, they create a defense-in-depth model where neither prompt injection nor token theft can authorize a high-value transaction without the human buyer's explicit approval.

### Protected Resource Metadata (RFC 9728)

The `/.well-known/oauth-protected-resource` endpoint is the linchpin. Without it, ChatGPT wouldn't know where to send users for authentication. This standard replaces hard-coded OAuth configuration with a discoverable, machine-readable metadata document.

```json
{
  "resource": "https://api.stylevault.com",
  "authorization_servers": ["https://your-tenant.us.auth0.com"],
  "scopes_supported": ["read:products", "read:wishlist", ...],
  "bearer_methods_supported": ["header"]
}
```

---

## Troubleshooting

### "Connection failed" in ChatGPT

- Verify the server is running and reachable from the internet
- Check that the URL includes `/mcp` (not just the domain)
- Ensure HTTPS is working (ChatGPT requires it)

### Authentication loop / consent not appearing

- Verify Auth0 API scopes match what the server advertises in `/.well-known/oauth-protected-resource`
- Check that the Auth0 Application has the correct callback URLs
- Check Auth0 logs (Dashboard > Monitoring > Logs) for errors

### "Invalid token" errors

- Verify `AUTH0_DOMAIN` in `.env` matches your actual tenant domain
- Verify `AUTH0_AUDIENCE` matches the API identifier in Auth0
- Check token expiration -- tokens may need refresh

### Tools not appearing in ChatGPT

- Send a `tools/list` request manually to verify tools are registered
- Check server logs for errors during initialization
- Reconnect the connector in ChatGPT settings

---

## Available MCP Tools Reference

| Tool | Parameters | Returns |
|------|-----------|---------|
| `search_products` | `query?`, `category?`, `max_price?`, `min_price?` | Array of matching products |
| `get_product_details` | `product_id` | Full product details |
| `get_wishlist` | (none) | User's wishlisted items |
| `get_order_history` | (none) | User's past orders |
| `place_order` | `product_id`, `quantity?` | Order confirmation or bounded authority error |
| `update_preferences` | `add` (string array) | Updated preferences list |

---

## Next Steps

- **Add Auth0 Actions** to embed `max_purchase_amount` in the access token as a custom claim, allowing per-user bounded authority limits
- **Enable Auth0 CIBA** for the escalation flow when purchases exceed the bounded authority limit
- **Deploy to production** with a real domain, SSL certificate, and database-backed storage
- **Add more tools** like `add_to_wishlist`, `track_order`, or `get_recommendations`
