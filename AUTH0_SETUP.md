# Auth0 Setup Guide for RetailZero Demos

This guide walks you through configuring Auth0 so the MCP (ChatGPT) and UCP (Gemini) demos work end-to-end. There are two paths: automated scripts that provision everything, or manual setup if you prefer to configure each piece yourself.

The automated path takes about 5 minutes. The manual path takes about 20.

---

## Prerequisites

- An Auth0 tenant (free tier works for MCP; CIBA requires an Enterprise plan or feature flag)
- Node.js 18+ installed
- The RetailZero repo cloned and dependencies installed (`npm install` in both root and `ucp-server/`)

---

## Path A: Automated Setup (Recommended)

The repo includes two setup scripts that provision Auth0 resources via the Management API. Run them in order.

### A.1 Create an M2M Application for the Setup Scripts

Before running the scripts, you need an M2M (Machine-to-Machine) application that has access to the Auth0 Management API. This is a one-time bootstrapping step.

1. Go to **Auth0 Dashboard > Applications > Create Application**
2. Choose **Machine to Machine**
3. Name it something like `RetailZero Setup Script`
4. Authorize it for the **Auth0 Management API** with these scopes:
   - `create:resource_servers`
   - `create:clients`
   - `create:client_grants`
   - `create:users`
   - `create:actions`
   - `update:actions`
   - `update:clients`
5. Note the **Client ID** and **Client Secret** -- the scripts will prompt for them

### A.2 Run the MCP Setup Script

```bash
cd ucp-server
npm run setup:chatgpt
```

This creates:
- **API (Resource Server)**: `https://app.retailzero.mvbuilt.com/api` with 5 scopes
- **MCP Server Application**: `RetailZero MCP Server` (M2M, `client_credentials` grant)
- **Client Grant**: Links the app to the API with all scopes
- **Test User**: `alex@example.com` / `Demo-Pass-2026!`
- **Post-Login Action**: `RetailZero Bounded Authority` (adds `$250` cap to tokens)
- **.env file**: Written to `ucp-server/.env`

### A.3 Run the UCP Setup Script

```bash
npm run setup:ucp
```

This adds:
- **UCP Identity Linking Application**: `RetailZero UCP Identity Linking` (Regular Web app, with CIBA grant type)
- **Client Grant**: Links the UCP app to the same API
- **SQLite Databases**: Products catalog and transactions store
- **Updated .env**: Merges `AUTH0_UCP_CLIENT_ID`, `AUTH0_UCP_CLIENT_SECRET`, `CIBA_ENABLED=true`

### A.4 Post-Script Steps (Required)

The scripts create the Action but cannot wire it into the Login Flow automatically. You must do this manually:

1. Go to **Auth0 Dashboard > Actions > Flows > Login**
2. Drag the **RetailZero Bounded Authority** Action into the flow (between Start and Complete)
3. Click **Apply**

For CIBA (escalation demo):

4. Go to **Auth0 Dashboard > Security > Multi-factor Auth > Push (Guardian)**
5. Enable Guardian push notifications
6. Enroll the test user's device (the test user needs the Auth0 Guardian app installed)

### A.5 Verify Your .env

After both scripts finish, `ucp-server/.env` should look like:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://app.retailzero.mvbuilt.com/api
AUTH0_CLIENT_ID=<mcp-client-id>
AUTH0_CLIENT_SECRET=<mcp-client-secret>

AUTH0_UCP_CLIENT_ID=<ucp-client-id>
AUTH0_UCP_CLIENT_SECRET=<ucp-client-secret>
CIBA_ENABLED=true

DATABASE_PATH=./data
PORT=3001
```

---

## Path B: Manual Setup

If you prefer to configure everything by hand, follow these steps.

### B.1 Create the API (Resource Server)

1. Go to **Auth0 Dashboard > Applications > APIs > Create API**
2. Configure:
   - **Name**: `RetailZero MCP API`
   - **Identifier**: `https://app.retailzero.mvbuilt.com/api`
   - **Signing Algorithm**: RS256
3. Under the **Permissions** tab, add these scopes:

| Scope | Description |
|-------|-------------|
| `read:products` | Search and view product catalog |
| `read:wishlist` | View saved wishlist items |
| `read:orders` | View order history |
| `write:preferences` | Update style preferences |
| `execute:purchase` | Place orders (bounded to agent limit) |

4. Under **Settings**, set:
   - **Token Expiration**: 86400 seconds (24h)
   - **Allow Offline Access**: Enabled (for refresh tokens)

### B.2 Create the MCP Server Application (ChatGPT)

This application represents the MCP server itself. ChatGPT obtains tokens through the OAuth flow, and the server validates them.

1. Go to **Applications > Create Application**
2. Choose **Machine to Machine**
3. Configure:
   - **Name**: `RetailZero MCP Server`
   - **Grant Types**: `client_credentials`
4. Authorize it for the `RetailZero MCP API` with all 5 scopes
5. Note the **Client ID** and **Client Secret**

### B.3 Create the UCP Identity Linking Application (Gemini)

This application handles the OAuth flow for Gemini's Identity Linking and supports CIBA for escalation.

1. Go to **Applications > Create Application**
2. Choose **Regular Web Application**
3. Configure:
   - **Name**: `RetailZero UCP Identity Linking`
   - **Grant Types**: `authorization_code`, `client_credentials`, `urn:openid:params:grant-type:ciba`
   - **Token Endpoint Auth Method**: `client_secret_post`
4. Under **Settings > Allowed Callback URLs**, add your server URL (e.g., `http://localhost:3001/callback`)
5. Authorize it for the `RetailZero MCP API` with all 5 scopes
6. Note the **Client ID** and **Client Secret**

> **Note**: The CIBA grant type (`urn:openid:params:grant-type:ciba`) requires Auth0 Enterprise or a specific feature flag. If your tenant doesn't support it, the escalation demo will simulate CIBA approval instead of triggering a real push notification.

### B.4 Create a Test User

1. Go to **User Management > Users > Create User**
2. Configure:
   - **Email**: `alex@example.com`
   - **Password**: `Demo-Pass-2026!`
   - **Connection**: `Username-Password-Authentication`
3. Mark the email as verified

### B.5 Create the Bounded Authority Action

This Action injects a spending limit into every access token. The MCP/UCP servers read this claim to enforce the `$250` agent transaction cap.

1. Go to **Actions > Library > Build Custom**
2. Configure:
   - **Name**: `RetailZero Bounded Authority`
   - **Trigger**: Login / Post Login
   - **Runtime**: Node 18
3. Paste this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = "https://app.retailzero.mvbuilt.com/api";
  api.accessToken.setCustomClaim(`${namespace}/max_purchase_amount`, 250);
  api.accessToken.setCustomClaim(`${namespace}/currency`, "USD");
};
```

4. Click **Deploy**
5. Go to **Actions > Flows > Login**
6. Drag **RetailZero Bounded Authority** into the flow between Start and Complete
7. Click **Apply**

### B.6 Enable Guardian (for CIBA / Escalation)

CIBA sends a push notification to the buyer's device when a purchase exceeds bounded authority. This requires Auth0 Guardian.

1. Go to **Security > Multi-factor Auth**
2. Enable **Push Notifications (Auth0 Guardian)**
3. Install the **Auth0 Guardian** app on a test device
4. Enroll the test user (`alex@example.com`) by triggering an MFA enrollment flow

> If CIBA is not available on your plan, the demos still work. The escalation flow will show the CIBA concept with a simulated approval instead of a real push notification.

### B.7 Write the .env File

Create `ucp-server/.env` with your values:

```env
# Auth0 Core
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://app.retailzero.mvbuilt.com/api

# MCP Server Application
AUTH0_CLIENT_ID=<your-mcp-client-id>
AUTH0_CLIENT_SECRET=<your-mcp-client-secret>

# UCP Identity Linking Application
AUTH0_UCP_CLIENT_ID=<your-ucp-client-id>
AUTH0_UCP_CLIENT_SECRET=<your-ucp-client-secret>

# CIBA (set to false if not available on your plan)
CIBA_ENABLED=true

# Database
DATABASE_PATH=./data

# Server
PORT=3001
```

---

## What Each Demo Requires

Not every Auth0 feature is needed for every demo. Here's the breakdown:

| Auth0 Feature | ChatGPT (MCP) | Gemini (UCP) | Gemini (UCP-over-MCP) |
|---------------|:-:|:-:|:-:|
| API + Scopes | Yes | Yes | Yes |
| MCP Server App (M2M) | Yes | -- | Yes |
| UCP Identity Linking App | -- | Yes | -- |
| Test User | Yes | Yes | Yes |
| Bounded Authority Action | Yes | Yes | Yes |
| JWKS Validation | Yes | Yes | Yes |
| Guardian / CIBA | Optional | Optional | Optional |

**Minimum viable setup** for demoing the core flow (auth, scoped tools, bounded authority): Steps B.1, B.2, B.4, B.5, and B.7. This covers the ChatGPT MCP demo and the MCP playground.

**Full setup** including UCP and escalation: All steps above.

---

## How Auth0 Fits Into Each Flow

### MCP Flow (ChatGPT, Claude)

```
Client connects to /mcp
  -> Server returns 401 + RFC 9728 Protected Resource Metadata
  -> Metadata points to Auth0 as the authorization server
  -> Client fetches Auth0's /.well-known/openid-configuration (RFC 8414)
  -> Client redirects user to Auth0 Universal Login
  -> User authenticates and consents to scopes
  -> Auth0 issues JWT with scopes + bounded authority claims
  -> Client sends JSON-RPC tool calls with Bearer token
  -> Server validates JWT signature via Auth0 JWKS
  -> Server checks scope claims before executing each tool
  -> For purchases > $250: server triggers CIBA escalation via Auth0
```

### UCP Flow (Gemini REST)

```
Gemini fetches /.well-known/ucp
  -> Manifest includes Auth0 authorization/token endpoints
  -> Gemini redirects user to Auth0 for Identity Linking
  -> User authenticates and consents
  -> Auth0 issues JWT with scopes + bounded authority claims
  -> Gemini calls REST endpoints with Bearer token
  -> Server validates JWT via JWKS on each request
  -> Checkout state machine enforces $250 bounded authority
  -> Escalated checkouts require CIBA approval before completion
```

### UCP-over-MCP Flow (Gemini JSON-RPC)

Same auth flow as MCP (401 + RFC 9728 discovery), but the tools exposed are UCP commerce operations (catalog, checkout state machine, orders) rather than generic MCP tools.

---

## Key Values Reference

| Item | Value |
|------|-------|
| API Identifier / Audience | `https://app.retailzero.mvbuilt.com/api` |
| Custom Claim Namespace | `https://app.retailzero.mvbuilt.com/api` |
| Bounded Authority Claim | `https://app.retailzero.mvbuilt.com/api/max_purchase_amount` |
| Currency Claim | `https://app.retailzero.mvbuilt.com/api/currency` |
| Bounded Authority Limit | `$250 USD` |
| Test User Email | `alex@example.com` |
| Test User Password | `Demo-Pass-2026!` |
| DB Connection Name | `Username-Password-Authentication` |
| JWKS URL | `https://{domain}/.well-known/jwks.json` |
| Token Issuer | `https://{domain}/` |
| MCP Endpoint | `/mcp` |
| UCP-over-MCP Endpoint | `/gemini-mcp` |
| UCP REST Base | `/ucp/v1/*` |
| UCP Manifest | `/.well-known/ucp` |
| Protected Resource Metadata | `/.well-known/oauth-protected-resource` |

---

## Connecting External Clients

### ChatGPT

1. Start the server: `cd ucp-server && npm run dev`
2. Expose it publicly via ngrok or Cloudflare Tunnel: `npx ngrok http 3001`
3. In ChatGPT: **Settings > Connectors > Add custom connector**
4. Enter the tunnel URL + `/mcp` as the server URL
5. Add the tunnel URL to your Auth0 app's **Allowed Callback URLs**

### Gemini (UCP)

1. Deploy or tunnel the server
2. Register at **Google Merchant Center** with the `/.well-known/ucp` manifest URL
3. Add the callback URL to your Auth0 UCP app's **Allowed Callback URLs**

---

## Troubleshooting

**401 on every tool call**: Check that the Action is wired into the Login Flow and that the API identifier matches `AUTH0_AUDIENCE` in your `.env`.

**"Invalid audience" errors**: The token's `aud` claim must match `https://app.retailzero.mvbuilt.com/api`. Verify the API identifier in Auth0 matches exactly.

**CIBA not working**: Confirm your Auth0 plan supports CIBA, Guardian is enabled, and the test user has enrolled a device. If CIBA is unavailable, set `CIBA_ENABLED=false` -- the demos will simulate escalation approval.

**"Action not found" after running setup script**: The script creates and deploys the Action, but you must manually drag it into the Login Flow. Go to **Actions > Flows > Login** and add it.

**Token missing bounded authority claims**: The token will only include custom claims if the Action is in the Login Flow AND deployed. Check both conditions in the Auth0 Dashboard.
