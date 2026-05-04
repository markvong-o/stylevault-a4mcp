# ChatGPT Remote MCP Server Integration Guide

This guide covers what it takes to turn the RetailZero MCP server into a production-ready remote MCP server that ChatGPT can connect to, with Auth0 handling the full OAuth 2.1 authorization flow.

---

## Where Things Stand Today

The MCP server (`mcp-server/`) works locally with Streamable HTTP transport. It registers six tools (search_products, get_product_details, get_wishlist, get_order_history, place_order, update_preferences), manages sessions in-memory, and has a placeholder for Auth0 JWT validation that currently skips verification when `AUTH0_DOMAIN` is not set. The transport layer at `/mcp` already handles POST (JSON-RPC requests), GET (SSE streams), and DELETE (session cleanup).

What's missing: real OAuth 2.1 authorization, HTTPS, session persistence, Dynamic Client Registration, token scope enforcement, and public deployment.

---

## Official Resources

| Resource | URL |
|----------|-----|
| MCP Specification | https://modelcontextprotocol.io/specification |
| MCP Transport Spec | https://modelcontextprotocol.io/specification/2025-03-26/basic/transports |
| MCP Authorization Spec | https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization |
| OpenAI Remote MCP Docs | https://platform.openai.com/docs/guides/tools-remote-mcp |
| Auth0 API Authorization | https://auth0.com/docs/get-started/apis |
| Auth0 PKCE Flow | https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce |
| RFC 9728 (Protected Resource Metadata) | https://datatracker.ietf.org/doc/html/rfc9728 |
| RFC 8414 (Authorization Server Metadata) | https://datatracker.ietf.org/doc/html/rfc8414 |
| RFC 7591 (Dynamic Client Registration) | https://datatracker.ietf.org/doc/html/rfc7591 |
| RFC 8707 (Resource Indicators) | https://datatracker.ietf.org/doc/html/rfc8707 |

---

## How ChatGPT Connects to Remote MCP Servers

When a user adds a remote MCP server in ChatGPT, here's the flow:

1. ChatGPT sends a POST to your `/mcp` endpoint
2. Your server responds with `401 Unauthorized` and a `WWW-Authenticate` header pointing to the protected resource metadata URL
3. ChatGPT fetches `/.well-known/oauth-protected-resource` from your server to discover the authorization server
4. ChatGPT fetches `/.well-known/openid-configuration` (or `/.well-known/oauth-authorization-server`) from Auth0 to discover endpoints
5. ChatGPT optionally registers itself as a client via Dynamic Client Registration (RFC 7591)
6. ChatGPT redirects the user to Auth0's `/authorize` endpoint with PKCE
7. The user authenticates via Auth0 Universal Login
8. Auth0 redirects back to ChatGPT with an authorization code
9. ChatGPT exchanges the code for an access token at Auth0's `/oauth/token` endpoint
10. ChatGPT includes the Bearer token on all subsequent requests to `/mcp`
11. Your server validates the token and serves tool calls

The MCP spec requires OAuth 2.1 with PKCE. Auth0 supports this natively, which makes it the right fit for the authorization server role.

---

## Phase 1: Enable Real JWT Validation

**Goal:** Make the existing auth middleware actually verify tokens instead of passing everything through.

**Current state:** `mcp/auth.ts` has jose-based JWT verification code but wraps it in a conditional that skips validation when `AUTH0_DOMAIN` is not configured.

**What to do:**

1. Set up environment variables:
   ```
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_AUDIENCE=https://app.retailzero.mvbuilt.com/api
   AUTH0_CLIENT_ID=...
   AUTH0_CLIENT_SECRET=...
   ```

2. Update `mcp/auth.ts` to always validate:
   - Remove the "demo mode" bypass
   - Fetch JWKS from `https://{AUTH0_DOMAIN}/.well-known/jwks.json` using `jose.createRemoteJWKSet()`
   - Verify token signature, issuer (`https://{AUTH0_DOMAIN}/`), audience, and expiration
   - Extract `sub`, `email`, and `scope` claims
   - Reject requests with invalid or expired tokens with `401`

3. Add the `WWW-Authenticate` header to 401 responses:
   ```
   WWW-Authenticate: Bearer resource_metadata="https://your-server.com/.well-known/oauth-protected-resource"
   ```
   This is how ChatGPT discovers your authorization flow. The MCP spec requires this header on authentication failures.

**Files to modify:** `mcp-server/src/auth.ts`

**Libraries:** `jose` (already installed)

---

## Phase 2: Protected Resource Metadata (RFC 9728)

**Goal:** Serve the metadata document that tells ChatGPT where to authenticate.

**Current state:** The server already has a `/.well-known/oauth-protected-resource` endpoint. Verify it returns the correct structure.

**Required response:**
```json
{
  "resource": "https://your-server.com",
  "authorization_servers": ["https://your-tenant.auth0.com"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": [
    "openid",
    "profile",
    "email",
    "read:products",
    "read:wishlist",
    "read:orders",
    "write:preferences",
    "execute:purchase"
  ]
}
```

**What to verify/update:**

1. `resource` field must be an HTTPS URL matching your deployed server
2. `authorization_servers` must point to your Auth0 domain (HTTPS)
3. `scopes_supported` should list all scopes your tools require
4. ChatGPT will use this to know which Auth0 tenant to talk to

**Files to modify:** The route handler serving `/.well-known/oauth-protected-resource`

---

## Phase 3: Auth0 Dashboard Setup

**Goal:** Configure Auth0 as the OAuth 2.1 authorization server.

### 3a. Create an API

1. Go to Auth0 Dashboard > Applications > APIs
2. Create a new API:
   - **Name:** RetailZero MCP API
   - **Identifier (Audience):** `https://app.retailzero.mvbuilt.com/api`
   - **Signing Algorithm:** RS256
3. Under the **Permissions** tab, add scopes:
   - `read:products` - Browse the product catalog
   - `read:wishlist` - View the user's wishlist
   - `read:orders` - View order history
   - `write:preferences` - Update style preferences
   - `execute:purchase` - Place orders on behalf of the user

### 3b. Enable PKCE

Auth0 supports PKCE by default for Single Page Applications and Native apps. For ChatGPT:

1. Create a new Application:
   - **Type:** Single Page Application (or Regular Web Application)
   - **Name:** ChatGPT MCP Client
2. Under Settings:
   - **Allowed Callback URLs:** Add ChatGPT's callback URL (provided by OpenAI when you register your server)
   - **Allowed Web Origins:** Add ChatGPT's origin
   - **Token Endpoint Authentication Method:** None (required for public clients using PKCE)
3. Under Advanced Settings > Grant Types:
   - Enable: Authorization Code
   - The PKCE extension is handled automatically

### 3c. Dynamic Client Registration (RFC 7591)

The MCP spec says servers SHOULD support Dynamic Client Registration so that any MCP client (not just ChatGPT) can onboard without manual setup.

Auth0 supports Dynamic Client Registration on paid plans:

1. Go to Auth0 Dashboard > Settings > Advanced
2. Enable "OIDC Discovery"
3. Enable Dynamic Client Registration under Tenant Settings
4. Set a default connection for dynamically registered clients

If you're on a free plan, you can skip this and manually register ChatGPT as a client (Phase 3b). ChatGPT will fall back to using the client_id you provide when registering the MCP server.

**Alternative for free plans:** Implement a thin proxy endpoint at `/register` that accepts RFC 7591 registration requests and creates Auth0 applications via the Management API.

### 3d. Authorization Server Metadata (RFC 8414)

Auth0 already serves this at:
```
https://your-tenant.auth0.com/.well-known/openid-configuration
```

Verify it includes these fields (Auth0 provides them by default):
- `authorization_endpoint`
- `token_endpoint`
- `registration_endpoint` (if Dynamic Client Registration is enabled)
- `scopes_supported`
- `response_types_supported` (must include `code`)
- `code_challenge_methods_supported` (must include `S256`)

No changes needed on your side. Auth0 handles this automatically.

---

## Phase 4: Scope Enforcement

**Goal:** Map MCP tool calls to OAuth scopes so tools only execute when the token grants permission.

**What to do:**

1. Define a scope-to-tool mapping:
   ```typescript
   const TOOL_SCOPES: Record<string, string> = {
     search_products: "read:products",
     get_product_details: "read:products",
     get_wishlist: "read:wishlist",
     get_order_history: "read:orders",
     place_order: "execute:purchase",
     update_preferences: "write:preferences",
   };
   ```

2. After JWT validation, extract the `scope` claim (space-separated string)
3. Before executing any tool handler, check that the token's scopes include the required scope for that tool
4. If the scope is missing, return an MCP error response:
   ```json
   {
     "jsonrpc": "2.0",
     "id": "...",
     "error": {
       "code": -32600,
       "message": "Insufficient scope. Required: execute:purchase"
     }
   }
   ```

**Files to modify:** `mcp-server/src/auth.ts` (scope extraction), tool registration handlers (scope checks)

---

## Phase 5: Resource Indicators (RFC 8707)

**Goal:** Ensure tokens are audience-bound to your server.

The MCP spec requires resource indicators so that tokens issued for your server can't be replayed against other servers.

**What to do:**

1. In the protected resource metadata (Phase 2), your `resource` field already declares the resource identifier
2. ChatGPT will include `resource=https://your-server.com` in the authorization request
3. Auth0 will scope the token's `aud` claim to your API identifier
4. Your JWT validation (Phase 1) already checks the `audience` parameter -- verify it matches your API identifier (`https://app.retailzero.mvbuilt.com/api`)

This mostly works out of the box with Auth0. The key is making sure the `audience` parameter in your jose verification matches what Auth0 issues.

---

## Phase 6: Session Persistence

**Goal:** Replace in-memory session storage with something that survives server restarts.

**Current state:** Sessions are stored in a `Map<string, ServerSession>` in memory. Each session has its own `McpServer` instance.

**What to do:**

1. Install a session store:
   ```bash
   cd mcp-server
   npm install better-sqlite3
   npm install -D @types/better-sqlite3
   ```

2. Create `mcp-server/src/data/sessions.ts`:
   ```sql
   CREATE TABLE IF NOT EXISTS sessions (
     session_id TEXT PRIMARY KEY,
     user_sub TEXT,
     created_at TEXT NOT NULL,
     last_active TEXT NOT NULL,
     metadata TEXT
   );
   ```

3. On each request:
   - Extract `Mcp-Session-Id` header
   - Look up session in SQLite
   - If found, restore the McpServer instance (or create a new one associated with that session_id)
   - Update `last_active` timestamp

4. Add session cleanup: DELETE sessions older than 24 hours on a periodic interval

5. On DELETE `/mcp` requests:
   - Remove the session from SQLite
   - Clean up the McpServer instance

**Note:** McpServer instances themselves can't be serialized, so you'll still create new instances per session. The database stores session identity and metadata, not the server object. This lets you validate session tokens across restarts and track usage.

**Files to modify:** The transport setup in the main server file, new `sessions.ts` data module

---

## Phase 7: HTTPS Deployment

**Goal:** Deploy the MCP server on a public HTTPS URL. The MCP authorization spec requires HTTPS for all authorization server endpoints, and ChatGPT needs a publicly reachable URL.

**Options (pick one):**

### Option A: Deploy to a cloud provider

**Recommended for production.** Deploy to Railway, Render, Fly.io, or any provider that gives you HTTPS out of the box.

Example with Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set environment variables in the provider's dashboard:
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://app.retailzero.mvbuilt.com/api
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
PORT=3001
```

### Option B: ngrok for development

Good for testing before deploying:
```bash
ngrok http 3001
```

This gives you a public HTTPS URL like `https://abc123.ngrok.io`. Use this URL as your server address when registering with ChatGPT.

**Important:** Update the `resource` field in your protected resource metadata to match your public URL.

---

## Phase 8: Register with ChatGPT

**Goal:** Add your MCP server to ChatGPT so users can interact with RetailZero tools.

### For Development/Testing

1. Go to ChatGPT Settings > Connected Apps (or similar, depending on current UI)
2. Add a new MCP server
3. Enter your server URL: `https://your-server.com/mcp`
4. ChatGPT will:
   - POST to `/mcp`, get a 401
   - Fetch `/.well-known/oauth-protected-resource`
   - Discover Auth0 as the authorization server
   - Redirect you to Auth0 for login
   - Exchange the auth code for a token
   - List available tools

### For Public Distribution (ChatGPT Actions / GPT Builder)

1. Go to https://platform.openai.com
2. Create a new GPT or Action
3. Configure it as a remote MCP server
4. Provide your server's base URL
5. OpenAI will verify your server's OAuth flow works
6. Submit for review

**Callback URL:** ChatGPT will provide a callback URL during setup. Add this to your Auth0 application's **Allowed Callback URLs**.

---

## Phase 9: Tool Descriptions and Annotations

**Goal:** Improve tool discoverability and safety metadata for ChatGPT.

ChatGPT uses tool descriptions to decide when to invoke them. Better descriptions lead to better tool selection.

**What to do:**

1. Review each tool's `description` in the MCP server registration code
2. Make descriptions action-oriented and specific:
   - Good: "Search the RetailZero product catalog by keyword. Returns matching products with name, price, category, and rating."
   - Bad: "Search products"

3. Add MCP tool annotations where applicable:
   ```typescript
   // For read-only tools
   { readOnlyHint: true, openWorldHint: false }
   
   // For tools that modify state
   { readOnlyHint: false, idempotentHint: false }
   
   // For place_order specifically
   { readOnlyHint: false, idempotentHint: false, destructiveHint: false }
   ```

4. These annotations help ChatGPT understand which tools are safe to call without explicit user confirmation

**Files to modify:** Tool registration in the MCP server setup

---

## Phase 10: Token Refresh

**Goal:** Handle token expiration gracefully.

Access tokens from Auth0 expire (default: 24 hours). The MCP spec expects servers to return `401` when a token expires, and clients to refresh transparently.

**What to do:**

1. Your JWT validation already rejects expired tokens (jose checks `exp` by default)
2. Make sure the 401 response includes the `WWW-Authenticate` header so ChatGPT knows to re-authenticate:
   ```
   WWW-Authenticate: Bearer error="invalid_token", error_description="Token expired"
   ```
3. ChatGPT handles refresh tokens internally. You don't need to implement refresh logic on the server side.

4. In Auth0, configure token lifetimes:
   - Go to APIs > Your API > Settings
   - Set **Token Expiration** (e.g., 3600 seconds for 1 hour)
   - Enable **Allow Offline Access** if you want refresh tokens issued

---

## Phase 11: Testing the Full Flow

**Goal:** Verify everything works end-to-end before going live.

### Manual testing checklist

1. **Auth discovery flow:**
   ```bash
   # Should return 401 with WWW-Authenticate header
   curl -X POST https://your-server.com/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"initialize","id":1}' \
     -v
   ```

2. **Protected resource metadata:**
   ```bash
   curl https://your-server.com/.well-known/oauth-protected-resource | jq
   ```

3. **Auth0 metadata:**
   ```bash
   curl https://your-tenant.auth0.com/.well-known/openid-configuration | jq
   ```

4. **Token validation:**
   ```bash
   # Get a token via Auth0's test flow
   TOKEN=$(curl -s -X POST https://your-tenant.auth0.com/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "...",
       "client_secret": "...",
       "audience": "https://app.retailzero.mvbuilt.com/api",
       "grant_type": "client_credentials"
     }' | jq -r '.access_token')
   
   # Use it
   curl -X POST https://your-server.com/mcp \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
   ```

5. **ChatGPT integration:**
   - Add the server in ChatGPT
   - Complete the Auth0 login flow
   - Ask ChatGPT to "search for leather jackets on RetailZero"
   - Verify the tool call executes and returns real results

### Automated testing

```bash
# Run the existing MCP server tests
cd mcp-server
npm test

# Test with the MCP Inspector (official debugging tool)
npx @anthropic-ai/mcp-inspector https://your-server.com/mcp
```

---

## Implementation Priority Order

| Phase | Effort | Impact | Prerequisite |
|-------|--------|--------|-------------|
| 1. JWT Validation | Low | Critical | Auth0 account |
| 2. Resource Metadata | Low | Critical | None |
| 3. Auth0 Dashboard | Low | Critical | Auth0 account |
| 4. Scope Enforcement | Low | High | Phase 1 |
| 5. Resource Indicators | Low | Medium | Phases 1-2 |
| 6. Session Persistence | Medium | Medium | None |
| 7. HTTPS Deployment | Medium | Critical | Phases 1-3 |
| 8. ChatGPT Registration | Low | Critical | Phase 7 |
| 9. Tool Annotations | Low | Medium | None |
| 10. Token Refresh | Low | Medium | Phase 1 |
| 11. Testing | Low | High | All phases |

Phases 1-5 are the core authorization stack. Phase 7 (deployment) unblocks Phase 8 (ChatGPT registration). Phases 6, 9, and 10 can happen in parallel with anything else.

The fastest path to a working ChatGPT integration: Phases 1, 2, 3, 7, 8. That gets you a deployed server with real Auth0 authorization that ChatGPT can connect to. Layer in scope enforcement, session persistence, and tool annotations after the basic flow is working.

---

## npm Install Summary

Libraries beyond what's already in package.json:

```bash
cd mcp-server

# Session persistence (when ready)
npm install better-sqlite3
npm install -D @types/better-sqlite3

# Logging (recommended)
npm install pino
npm install -D @types/pino
```

`jose` and `@modelcontextprotocol/sdk` are already installed. Auth0 SDKs are not needed on the server side since jose handles JWT validation directly.

---

## Key Differences from the UCP Guide

| Concern | UCP Integration | ChatGPT MCP Integration |
|---------|----------------|------------------------|
| Protocol | UCP (REST + custom headers) | MCP (JSON-RPC over HTTP) |
| Auth flow | RFC 9421 HTTP Signatures | OAuth 2.1 + PKCE |
| Auth provider role | Auth0 validates identity + CIBA escalation | Auth0 is the full OAuth authorization server |
| Discovery | `/.well-known/ucp` manifest | `/.well-known/oauth-protected-resource` + `/.well-known/openid-configuration` |
| Client registration | N/A (agents are pre-registered) | RFC 7591 Dynamic Client Registration |
| Transport | REST API | Streamable HTTP (POST/GET/DELETE with session headers) |
| Already implemented | Mostly scaffolded | Transport works, auth needs wiring |

The MCP server is closer to production-ready than the UCP server. The transport layer works correctly. The main gap is turning on real Auth0 authorization and deploying to a public HTTPS URL.
