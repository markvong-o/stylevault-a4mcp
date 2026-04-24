# UCP Production Integration Guide

This guide covers what it takes to bring the RetailZero UCP server from its current demo state to a conformance-ready implementation that can pass Google's test suite and onboard to Google Merchant Center.

---

## Where Things Stand Today

The server (`ucp-server/`) has working endpoints for manifest discovery, catalog search, checkout sessions, and orders. But everything runs in-memory, auth is bypassed, payments aren't processed, and there's no idempotency or webhook delivery. The reference implementation from Google uses Hono + SQLite + Zod -- the same stack minus Express.

---

## Official Resources

| Resource | URL |
|----------|-----|
| UCP Spec | https://ucp.dev |
| Google Developer Docs | https://developers.google.com/merchant/ucp |
| Spec Repo | https://github.com/universal-commerce-protocol/ucp |
| Node.js Reference Sample | https://github.com/universal-commerce-protocol/samples/tree/main/rest/nodejs |
| JS SDK (types + Zod schemas) | https://github.com/universal-commerce-protocol/js-sdk |
| Conformance Test Suite | https://github.com/universal-commerce-protocol/conformance |

---

## Phase 1: Database + Persistence

**Goal:** Replace all in-memory Maps with SQLite so data survives restarts.

**Libraries to install:**
```bash
cd ucp-server
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

**What to do:**

1. Create `ucp-server/src/data/db.ts` -- initialize two SQLite databases:
   - `products.db`: products table, inventory table
   - `transactions.db`: checkouts, orders, idempotency_keys, request_logs

2. Migrate `checkout.ts`:
   - Replace `sessions = new Map<string, CheckoutSession>()` with SQLite reads/writes
   - Store sessions as serialized JSON in a `checkouts` table
   - Add `saveCheckout()` and `getCheckoutSession()` data helpers

3. Migrate `orders.ts`:
   - Replace `orders = new Map<string, Order>()` with `orders` table
   - Add `saveOrder()` and `getOrder()` helpers

4. Migrate `data/products.ts`:
   - Move PRODUCTS array into `products.db` seed script
   - Add `inventory` table with `product_id` and `quantity` columns
   - Implement atomic `reserveStock()`: `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?`
   - Implement `releaseStock()` for rollbacks

**Reference:** `samples/rest/nodejs/src/data/db.ts`, `transactions.ts`, `inventory.ts`

**Schema sketch:**
```sql
-- transactions.db
CREATE TABLE IF NOT EXISTS checkouts (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  checkout_id TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  body_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT,
  url TEXT,
  checkout_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);
```

---

## Phase 2: Idempotency

**Goal:** Prevent duplicate checkouts. Same request sent twice should return the same response.

**How it works:**
1. On `POST /checkout-sessions`, hash the request body with SHA-256
2. Check `idempotency_keys` table for existing hash
3. If found with same body: return cached response
4. If found with different body: return `409 Conflict`
5. If not found: process request, cache response

**Libraries:** None extra needed. Use Node's built-in `crypto.createHash('sha256')`.

**Files to modify:** `checkout.ts` (create and complete endpoints)

**Reference:** `samples/rest/nodejs/src/data/transactions.ts` (`getIdempotencyRecord`, `saveIdempotencyRecord`)

---

## Phase 3: UCP JS SDK Integration

**Goal:** Use Google's official types and Zod schemas instead of hand-rolled ones.

**Install:**
```bash
npm install @anthropic-ai/ucp-sdk  # Check npm registry; may be published as a different name
# OR clone and link locally:
git clone https://github.com/universal-commerce-protocol/js-sdk.git ../js-sdk
cd ../js-sdk && npm install && npm run build
cd ../ucp-server && npm link ../js-sdk
```

**What to do:**
1. Replace the hand-rolled `CreateSessionSchema` in `checkout.ts` with the SDK's `CheckoutSessionCreateRequestSchema`
2. Use SDK types for responses (`CheckoutSession`, `Order`, etc.)
3. Use `@hono/zod-validator` middleware for automatic 422 errors on bad input

**Install Hono validator:**
```bash
npm install @hono/zod-validator
```

**Reference:** `samples/rest/nodejs/src/models/extensions.ts`

---

## Phase 4: Version Negotiation

**Goal:** Validate the `UCP-Agent` header and reject incompatible client versions.

**What to do:**

Add middleware in `auth.ts` (or a new `version.ts`):
1. Parse `UCP-Agent` header from incoming requests
2. Extract client version string
3. Compare against server's version (`2026-01-23`)
4. If client version is newer than server: return `400 Bad Request` with message explaining version incompatibility

**Reference:** `samples/rest/nodejs/src/index.ts` (middleware section)

---

## Phase 5: RFC 9421 HTTP Message Signatures

**Goal:** Verify that requests from agents are cryptographically signed.

**Libraries:**
```bash
npm install http-message-signatures  # Or implement manually per RFC 9421
```

RFC 9421 is relatively new and JS library support is limited. You may need to implement the core verification logic:

1. Parse `Signature-Input` and `Signature` headers
2. Reconstruct the signature base from specified components
3. Fetch the agent's public key from their `/.well-known/ucp` profile (cache it)
4. Verify the signature using RSA-PSS, ECDSA, or HMAC depending on algorithm
5. Reject requests with invalid or missing signatures

**Files to modify:** `auth.ts` -- replace the current pass-through with real verification

**What the middleware should do:**
```
1. Extract Signature-Input header -> parse covered components
2. Extract Signature header -> get signature bytes
3. Reconstruct signature base string from request
4. Fetch agent's signing keys (cache with TTL)
5. Verify signature against public key
6. If invalid: return 401
7. If valid: continue
```

**Reference:** RFC 9421 spec at https://datatracker.ietf.org/doc/html/rfc9421

---

## Phase 6: Auth0 Integration

**Goal:** Wire up real Auth0 for identity linking and CIBA escalation.

**Libraries:**
```bash
npm install express-oauth2-jwt-bearer  # For Express-based JWT validation
# OR for Hono:
npm install jose  # Already in your deps -- use this
```

### 6a. JWT Validation for Identity Linking

Your `mcp/auth.ts` already has the jose-based JWT verification pattern. Port it to the UCP auth middleware:

1. When a request includes `Authorization: Bearer <token>`:
   - Fetch JWKS from `https://{AUTH0_DOMAIN}/.well-known/jwks.json`
   - Verify token signature, issuer, audience, expiration
   - Extract `sub`, `email`, `scope` claims
   - Make claims available to route handlers via Hono context

2. Required Auth0 config (environment variables):
   ```
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_AUDIENCE=https://api.stylevault.com
   AUTH0_CLIENT_ID=...
   AUTH0_CLIENT_SECRET=...
   ```

### 6b. CIBA for Escalation

When checkout enters `requires_escalation`:

1. Server calls Auth0 CIBA endpoint:
   ```
   POST https://{AUTH0_DOMAIN}/bc-authorize
   Content-Type: application/x-www-form-urlencoded

   client_id={CLIENT_ID}
   &client_secret={CLIENT_SECRET}
   &scope=openid
   &login_hint={buyer_email}
   &binding_message=Approve+$269+purchase+from+RetailZero
   ```

2. Auth0 sends push notification to buyer via Auth0 Guardian

3. Poll for approval:
   ```
   POST https://{AUTH0_DOMAIN}/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=urn:openid:params:grant-type:ciba
   &client_id={CLIENT_ID}
   &client_secret={CLIENT_SECRET}
   &auth_req_id={auth_req_id_from_step_1}
   ```

4. On approval, Auth0 returns a token. Use this as the escalation token.

5. On `POST /checkout-sessions/:id/complete`, validate the `X-UCP-Escalation-Token` header is a valid Auth0 token.

### 6c. Auth0 Dashboard Setup

1. Create an API in Auth0 (identifier: `https://api.stylevault.com`)
2. Define scopes: `read:products`, `read:wishlist`, `read:orders`, `write:preferences`, `execute:purchase`
3. Enable CIBA grant type on your application
4. Set up Auth0 Guardian for push notifications
5. Create an Auth0 Action to inject `max_purchase_amount` claim into access tokens (bounded authority at the token level)

---

## Phase 7: Payment Processing

**Goal:** Actually charge customers instead of accepting any request.

**Libraries:**
```bash
npm install stripe  # Or whichever provider you choose
```

**Payment handlers to implement:**
- Google Pay (required for Google Merchant Center)
- Stripe (recommended for general payment)
- Mock handler (for testing -- accept any token)

**Pattern from reference implementation:**
1. Checkout session stores `payment_credentials` from the agent
2. On `POST /checkout-sessions/:id/complete`, validate credentials against the appropriate handler
3. If payment fails: return `402 Payment Required`
4. If payment succeeds: transition to `completed`, create order

**Google Pay integration:** Follow https://developers.google.com/pay/api for server-side token processing.

---

## Phase 8: Webhook Delivery

**Goal:** Notify agents when order status changes.

**What to do:**

1. Parse the agent's webhook URL from their UCP profile (provided via `UCP-Agent` header)
2. On key events (order_placed, order_shipped, order_canceled), POST a JSON payload to the webhook URL:
   ```json
   {
     "event": "order_placed",
     "order_id": "ucp_ord_...",
     "checkout_id": "ucp_sess_...",
     "timestamp": "2026-04-19T..."
   }
   ```
3. Implement retry logic (3 attempts with exponential backoff)
4. Log delivery status for debugging

**Files to modify:** `checkout.ts` (on complete), `orders.ts` (on status change)

---

## Phase 9: Fulfillment

**Goal:** Support shipping address collection and carrier selection.

**What to add to checkout flow:**

1. Extend `CheckoutSession` with `fulfillment` field:
   - `addresses`: buyer's saved addresses
   - `selected_address_id`: chosen shipping address
   - `shipping_options`: available methods (standard, express)
   - `selected_shipping_option_id`: chosen method

2. On `PUT /checkout-sessions/:id`, accept fulfillment updates
3. Block `complete` if fulfillment is not resolved
4. On completion, include fulfillment details in order

**Reference:** `samples/rest/nodejs/src/api/checkout.ts` (fulfillment handling)

---

## Phase 10: Conformance Testing

**Goal:** Pass Google's conformance test suite.

**Setup:**
```bash
# Clone conformance tests
git clone https://github.com/universal-commerce-protocol/conformance.git

# Install Python deps
cd conformance
pip install uv  # If not already installed
uv sync

# Start your server
cd ../ucp-server && npm run dev

# Run tests
cd ../conformance
uv run pytest checkout_lifecycle_test.py -v --server-url=http://localhost:3001
uv run pytest idempotency_test.py -v --server-url=http://localhost:3001
uv run pytest webhook_test.py -v --server-url=http://localhost:3001
uv run pytest order_test.py -v --server-url=http://localhost:3001
uv run pytest fulfillment_test.py -v --server-url=http://localhost:3001
uv run pytest protocol_test.py -v --server-url=http://localhost:3001
uv run pytest validation_test.py -v --server-url=http://localhost:3001
```

**Test categories (13 total):**
1. Checkout lifecycle (create, read, update, complete, cancel)
2. Idempotency (duplicate prevention, conflict detection)
3. Webhooks (event delivery, retry)
4. Order management (retrieval, updates, fulfillment events)
5. Fulfillment (address handling, shipping options)
6. Protocol compliance (discovery, version negotiation)
7. Input validation (bad payloads, out-of-stock)
8. Business logic (discounts, pricing, free shipping rules)
9. Payment credentials (Google Pay, card, mock)
10. AP2 (Apple Pay 2)
11. Security (simulation URL restrictions)
12. Error handling (structured error responses)
13. Binding operations

**Note:** The tests expect a "flower shop" dataset. You'll need to either adapt the tests for RetailZero's product catalog or seed your database with the test fixtures from `conformance/test_data/flower_shop/`.

---

## Phase 11: Google Merchant Center Onboarding

Once conformance tests pass:

1. **Merchant Center account** -- Set up at https://merchants.google.com
2. **Product feed** -- Submit your catalog via Content API or Merchant Center UI
3. **Shipping settings** -- Configure rates and delivery windows
4. **Returns policy** -- Define return windows and conditions
5. **UCP profile publishing** -- Ensure `/.well-known/ucp` is publicly accessible
6. **Google Pay** -- Complete Google Pay integration and certification
7. **Verification** -- Google reviews your integration before enabling live traffic

---

## Implementation Priority Order

| Phase | Effort | Impact | Prerequisite |
|-------|--------|--------|-------------|
| 1. Database | Medium | High | None |
| 2. Idempotency | Low | High | Phase 1 |
| 3. JS SDK Types | Low | Medium | None |
| 4. Version Negotiation | Low | Medium | None |
| 5. RFC 9421 | High | High | None |
| 6. Auth0 | Medium | High | None |
| 7. Payment | High | Critical | Phase 1 |
| 8. Webhooks | Medium | High | Phase 1 |
| 9. Fulfillment | Medium | High | Phase 1 |
| 10. Conformance | Low | Critical | Phases 1-9 |
| 11. Merchant Center | Low | Critical | Phase 10 |

Phases 1-4 and 6 can be done in parallel. Phase 5 (RFC 9421) is independent. Phases 7-9 depend on having a database. Phase 10 validates everything. Phase 11 is the finish line.

---

## npm Install Summary

All libraries you'll need beyond what's already in package.json:

```bash
cd ucp-server

# Database
npm install better-sqlite3
npm install -D @types/better-sqlite3

# Validation middleware
npm install @hono/zod-validator

# Payment (when ready)
npm install stripe

# Logging (recommended)
npm install pino pino-http
npm install -D @types/pino
```

`jose` and `zod` are already in your deps. `uuid` can be replaced with `crypto.randomUUID()` (built-in).
