# Connecting ChatGPT to RetailZero via MCP + Auth0

This guide walks through setting up the RetailZero MCP server, configuring Auth0 as the authorization server, and connecting ChatGPT so it can search products, view wishlists, and place orders on behalf of your users.

By the end, you'll have a working integration where ChatGPT authenticates users through Auth0, receives scoped access tokens, and calls RetailZero tools with bounded authority enforcement.

---

## Architecture Overview

```
ChatGPT                     Auth0                      RetailZero MCP Server
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
   - **Name:** `RetailZero API`
   - **Identifier:** `https://app.retailzero.mvbuilt.com/api`
   - **Signing Algorithm:** RS256
4. Click **Create**

### 1.2 Define Scopes

On the API's **Permissions** tab, add these scopes:

| Scope | Description |
|-------|-------------|
| `read:products` | Search and view product catalog |
| `read:wishlist` | View saved wishlist items |
| `read:orders` | View order history |
| `read:cart` | View the current shopping cart |
| `write:cart` | Add, update, remove items in the cart |
| `write:preferences` | Update style preferences |
| `execute:purchase` | Check out the cart (CIBA step-up required above $100) |

### 1.3 Create a Machine-to-Machine Application (for the MCP server)

1. Go to **Applications > Applications**
2. Click **Create Application**
3. Choose **Machine to Machine Applications**
4. Name it `RetailZero MCP Server`
5. Authorize it for the `RetailZero API`
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
3. Optionally customize the login page with RetailZero branding

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
AUTH0_AUDIENCE=https://app.retailzero.mvbuilt.com/api
PORT=3001
```

> **Demo mode:** If you leave `AUTH0_DOMAIN` as `your-tenant.us.auth0.com`, the server runs in demo mode with no authentication required. This is useful for local testing but won't work with ChatGPT's OAuth flow.

### 2.3 Start the Server

```bash
npm run dev
```

You should see:

```
RetailZero Server running on port 3001

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

Once authenticated, you'll see the RetailZero tools appear in ChatGPT.

### 4.4 Configure Tool Permissions

Back in ChatGPT settings, click the RetailZero connector to see the available tools:

- **search_products** -- Search the catalog
- **get_product_details** -- Get full product info
- **get_wishlist**, **add_to_wishlist**, **remove_from_wishlist** -- Manage saved items
- **get_recommendations** -- Personalized suggestions
- **get_order_history** -- View past orders
- **add_to_cart**, **view_cart**, **update_cart_item**, **remove_from_cart**, **clear_cart** -- Manage the shopping cart
- **checkout_cart** -- Check out the cart (triggers CIBA above $100)
- **complete_ciba_checkout** -- Finalize the order after the user approves on their device
- **update_preferences** -- Update style preferences

Enable or disable tools as needed.

---

## Part 5: Test the Integration

Start a new conversation in ChatGPT and try these prompts:

### Search the catalog

> "Search RetailZero for leather bags under $300"

ChatGPT should call `search_products` and return results like:
- City Tote -- $199
- Compact Travel Satchel -- $149
- Heritage Duffle -- $269

### View your wishlist

> "Show me my RetailZero wishlist"

ChatGPT should call `get_wishlist` and return 4 items including the Cashmere Wrap Scarf, Blue Denim Jacket, Leather Weekender Bag, and Meridian Automatic Watch.

### Place an order (under CIBA threshold)

> "Add the Canvas Sneakers to my cart, then check out"

ChatGPT should call `add_to_cart` with `product_id: "sneakers_canvas_001"`, then `checkout_cart`. Because the total ($89) is under the $100 threshold, the order is confirmed immediately without a CIBA step-up.

### CIBA step-up for high-value checkout

> "Add the Heritage Duffle to my cart and buy it"

ChatGPT should call `add_to_cart`, then `checkout_cart`. The $269 total exceeds the $100 threshold, so the server initiates a CIBA push to the user's device and returns `auth_req_id`. After the user approves on their device, ChatGPT calls `complete_ciba_checkout` with the auth_req_id to finalize the order.

### Update preferences

> "Add 'leather bags' and 'weekend travel' to my RetailZero preferences"

ChatGPT should call `update_preferences` and confirm the preferences were added.

---

## How It Works: The Security Model

### Token Scopes

Each MCP tool maps to an OAuth scope. Auth0 issues access tokens with only the scopes the user consented to. If a user denied the `execute:purchase` scope during consent, the `checkout_cart` tool would fail with a permission error.

### CIBA Step-Up at $100

The $100 threshold is a server-side merchant policy, not a token claim. Any cart checkout above $100 routes through Auth0 CIBA: the server calls `/bc-authorize` with the user's `sub` as `login_hint` and a human-readable `binding_message` that describes the exact amount and merchant. Auth0 pushes that message to the user's enrolled Guardian device. The MCP server does not finalize the order until the user approves on their own device, and the LLM receives a structured `auth_req_id` that it passes to `complete_ciba_checkout` to poll for the result.

This separation matters: the scope grants the *capability* to purchase, while the CIBA gate controls the *magnitude*. Together, they create a defense-in-depth model where neither prompt injection nor token theft can authorize a high-value transaction without the human buyer's explicit approval on a second channel.

### Protected Resource Metadata (RFC 9728)

The `/.well-known/oauth-protected-resource` endpoint is the linchpin. Without it, ChatGPT wouldn't know where to send users for authentication. This standard replaces hard-coded OAuth configuration with a discoverable, machine-readable metadata document.

```json
{
  "resource": "https://app.retailzero.mvbuilt.com/api",
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
| `add_to_wishlist` | `product_id` | Updated wishlist |
| `remove_from_wishlist` | `product_id` | Updated wishlist |
| `get_recommendations` | `limit?` | Personalized product suggestions |
| `get_order_history` | (none) | User's past orders |
| `add_to_cart` | `product_id`, `quantity?` | Updated cart |
| `view_cart` | (none) | Current cart line items and total |
| `update_cart_item` | `product_id`, `quantity` | Updated cart (quantity 0 removes) |
| `remove_from_cart` | `product_id` | Updated cart |
| `clear_cart` | (none) | Empty cart confirmation |
| `checkout_cart` | (none) | Order confirmation, or `step_up_required` with `auth_req_id` when total > $100 |
| `complete_ciba_checkout` | `auth_req_id` | Order confirmation, or `authorization_pending` to retry |
| `update_preferences` | `add` (string array) | Updated preferences list |

---

## Next Steps

- **Add Auth0 Actions** to embed per-user CIBA thresholds in the access token as a custom claim, replacing the single $100 server-side default with per-segment policies
- **Tune the Auth0 CIBA application** (`AUTH0_CIBA_CLIENT_ID` / `AUTH0_CIBA_CLIENT_SECRET`) and enroll the buyer's device with Auth0 Guardian before running the high-value demo path
- **Deploy to production** with a real domain, SSL certificate, and database-backed storage
- **Add more tools** like `add_to_wishlist`, `track_order`, or `get_recommendations`
