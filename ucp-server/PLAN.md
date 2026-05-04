# RetailZero UCP Production Integration Plan

## Overview

This plan covers what's needed to take the RetailZero UCP merchant server from a demo mock to a production-grade, Google-conformant implementation secured by Auth0. The work is organized into four tiers by priority.

---

## Current State

The demo server (`ucp-server/`) has:
- `/.well-known/ucp` manifest (simplified)
- Checkout session CRUD with basic state machine
- Catalog search with product data
- Order retrieval with seeded data
- Hono + Zod stack (matches official UCP Node.js sample)
- Auth middleware placeholder (accepts all requests)

---

## Tier 1: Protocol Conformance (Must Have)

These are hard requirements tested by the [UCP conformance suite](https://github.com/Universal-Commerce-Protocol/conformance). Nothing ships to Google without passing all 13 test categories.

### 1.1 HTTP Message Signatures (RFC 9421)

Every request and response must be cryptographically signed. This is the single largest gap.

**What to build:**
- Middleware to verify inbound agent signatures against their public key (fetched from agent's `/.well-known/ucp` profile)
- Response signing middleware that attaches `Signature`, `Signature-Input`, and `Content-Digest` headers to all outbound responses
- Webhook signature generation for outbound event deliveries
- Key pair management (generate, rotate, publish public key in manifest)

**Headers required on every response:**
```
Content-Digest: sha-256=:<base64-encoded-sha256-of-body>:
Signature: sig1=:<base64-encoded-signature>:
Signature-Input: sig1=("@status" "content-digest");created=<unix-timestamp>
```

**Libraries to evaluate:**
- `httpbis-message-signatures` (Node.js)
- Custom implementation against [RFC 9421 spec](https://datatracker.ietf.org/doc/html/rfc9421)

**Auth0 role:** Could manage signing keys as secrets, or use Auth0 Actions to sign outbound tokens.

### 1.2 Idempotency Storage

Current server accepts `Idempotency-Key` headers but does nothing with them. Production requires request deduplication.

**What to build:**
- Persistence layer for idempotency keys (Redis recommended, SQLite acceptable)
- Middleware that checks if a key was seen before and returns the cached response
- Key expiration (24-hour TTL is standard)
- Applies to all state-modifying endpoints: `POST /checkout-sessions`, `POST .../complete`, `POST .../cancel`

**Schema:**
```
idempotency_keys:
  key: string (UUID from header)
  method: string
  path: string
  status_code: number
  response_body: JSON
  created_at: timestamp
  expires_at: timestamp
```

### 1.3 Checkout Session Schema Compliance

The current schema uses simplified fields. Production requires the full UCP checkout object.

**Fields to add:**
- `currency` (ISO 4217, e.g. "USD")
- `totals` object: `{ subtotal, tax, shipping, discount, total }` (all in cents, not dollars)
- `links`: `{ privacy_policy, terms_of_service }` URLs
- `ucp.version`: Protocol version metadata (e.g. "2026-04-08")
- `expires_at`: RFC 3339 timestamp (default 6 hours from creation)
- `buyer` object: `{ email, first_name, last_name }` (required at completion)
- `fulfillment` object with shipping methods, destinations, and address schemas
- `payment` object with instrument declarations
- `context` object for localization (language, region)
- `messages` array with `{ type, code, message, severity }` structure

**Price format change:** All amounts must be integers in cents (e.g. `26900` not `269.00`).

**State machine enforcement:** Validate transitions strictly:
```
incomplete <-> requires_escalation
incomplete -> ready_for_complete
ready_for_complete -> complete_in_progress -> completed
[any state] -> canceled (except completed)
```

### 1.4 Webhook Delivery System

When a checkout completes or an order status changes, the server must POST events to a platform-provided webhook URL.

**What to build:**
- Webhook URL storage (provided by Google during onboarding)
- Event queue with reliable delivery (use BullMQ + Redis, or a managed queue)
- Exponential backoff retries on failed deliveries
- RFC 9421 signed webhook payloads
- Full order entity in each event payload (not incremental diffs)

**Required events:**
- Order created (immediately when checkout completes)
- Order shipped (when fulfillment status changes)
- Order delivered
- Order returned/refunded

**Webhook payload structure:**
```json
{
  "event_id": "evt_<unique>",
  "created_time": "<RFC 3339>",
  "order": {
    "id": "order_123",
    "checkout_id": "checkout_abc",
    "permalink_url": "https://retailzero.com/orders/123",
    "line_items": [...],
    "fulfillment": { "expectations": [...], "events": [...] },
    "currency": "USD",
    "totals": {...}
  }
}
```

### 1.5 Agent Profile Negotiation

When an agent sends `UCP-Agent: profile="https://agent.example.com/.well-known/ucp"`, the server must fetch their profile and compute capability intersection.

**What to build:**
- Fetch and cache agent profiles (with TTL)
- Compute intersection of: capabilities, payment handlers, extensions
- Return only mutually supported options in checkout responses
- Reject agents with zero capability overlap

### 1.6 Discovery Manifest Updates

The `/.well-known/ucp` manifest needs to match the production schema.

**Current (simplified):**
```json
{ "name": "RetailZero", "capabilities": ["dev.ucp.shopping.checkout", ...] }
```

**Production (required):**
```json
{
  "ucp": "2026-04-08",
  "services": [{
    "id": "dev.ucp.shopping",
    "version": "1.0",
    "transport": "rest",
    "endpoint": "https://app.retailzero.mvbuilt.com/api/",
    "schema": { "$ref": "https://app.retailzero.mvbuilt.com/api/openapi.json" }
  }],
  "capabilities": [{
    "id": "dev.ucp.shopping.checkout",
    "version": "1.0",
    "spec": "https://ucp.dev/specification/checkout"
  }],
  "payment_handlers": [{
    "id": "stripe",
    "name": "Stripe",
    "version": "1.0",
    "available_instruments": ["card", "digital_wallet"]
  }],
  "public_key": "<PEM or JWK for signature verification>"
}
```

---

## Tier 2: Commerce Backend (Required for Real Transactions)

### 2.1 Payment Processor Integration (AP2)

**What to build:**
- Stripe integration (primary) with tokenized payment handling
- Google Pay support (required by Google at launch, PayPal coming later)
- Payment handler declaration in manifest
- Token binding during checkout completion
- Refund processing

**Checkout completion flow:**
```
Agent sends: POST /checkout-sessions/{id}/complete
  with payment.instruments[0].handler_id = "stripe"
  with payment.instruments[0].token = "<google_pay_or_stripe_token>"

Server:
  1. Validates token with Stripe API
  2. Creates Stripe PaymentIntent
  3. Confirms payment
  4. Transitions session to completed
  5. Creates order
  6. Fires webhook
```

**Auth0 role:** Token exchange can include payment authorization scopes. Bounded authority claims (`max_purchase_amount`) in the access token enforce agent spending limits before the payment even hits Stripe.

### 2.2 Tax Calculation

**What to build:**
- Integration with tax provider (Stripe Tax, TaxJar, or Avalara)
- Tax calculation on every checkout update (address change, item change)
- Tax breakdown in `totals.tax` field
- Tax-exempt item handling

**Triggers recalculation:**
- Line item added/removed/quantity changed
- Fulfillment destination changed
- Discount applied/removed

### 2.3 Shipping and Fulfillment

**What to build:**
- Carrier rate API integration (UPS, FedEx, USPS)
- Dynamic shipping method generation based on destination and cart weight
- Tracking number generation on order creation
- Fulfillment event posting via webhooks (shipped, delivered)
- Support for multiple fulfillment types: `shipping`, `pickup`, `digital`

**Fulfillment in checkout response:**
```json
{
  "fulfillment": {
    "methods": [{
      "id": "method_shipping_std",
      "type": "shipping",
      "title": "Standard Shipping (5-7 days)",
      "total_amount": 500
    }, {
      "id": "method_shipping_exp",
      "type": "shipping",
      "title": "Express Shipping (2-3 days)",
      "total_amount": 1200
    }],
    "selected_destination_id": "dest_1"
  }
}
```

### 2.4 Inventory Management

**What to build:**
- Real stock levels per product
- Stock reservation on session creation
- Stock release on session cancellation or expiration
- Out-of-stock error responses with proper UCP message codes

### 2.5 Persistence Layer

Replace in-memory `Map` storage with a real database.

**Recommended:** PostgreSQL or SQLite for sessions/orders, Redis for idempotency keys and webhook queue.

**Tables:**
- `checkout_sessions` (full UCP schema)
- `orders` (with fulfillment events)
- `products` (with inventory)
- `idempotency_keys` (with TTL)
- `webhook_events` (with delivery status and retry count)

---

## Tier 3: Auth0 Identity Layer

This is where Auth0 provides the most direct value. Instead of building OAuth from scratch, Auth0 handles the entire identity linking flow.

### 3.1 Auth0 as OAuth 2.0 Provider

**What to configure:**
- Auth0 tenant as the `issuer` in the UCP manifest's `auth` block
- Auth0 API with UCP scopes: `ucp:scopes:checkout_session`, `ucp:catalog:read`, `ucp:orders:read`
- Machine-to-machine application for the UCP server
- Regular web application for browser-based identity linking

**OAuth metadata endpoint:**
Auth0 automatically serves `/.well-known/openid-configuration`. Map this to what UCP expects at `/.well-known/oauth-authorization-server`:
```json
{
  "issuer": "https://retailzero.us.auth0.com",
  "authorization_endpoint": "https://retailzero.us.auth0.com/authorize",
  "token_endpoint": "https://retailzero.us.auth0.com/oauth/token",
  "revocation_endpoint": "https://retailzero.us.auth0.com/oauth/revoke",
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic"]
}
```

### 3.2 JWT Validation Middleware

Replace the placeholder `auth.ts` with real Auth0 JWT validation.

**What to build:**
- JWKS fetching from `https://retailzero.us.auth0.com/.well-known/jwks.json`
- JWT signature verification using `jose` library
- Issuer, audience, and expiration validation
- Scope extraction and enforcement per endpoint
- Bounded authority claim extraction (`max_purchase_amount`)

**Implementation:**
```typescript
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://retailzero.us.auth0.com/.well-known/jwks.json")
);

// In middleware:
const { payload } = await jwtVerify(token, JWKS, {
  issuer: "https://retailzero.us.auth0.com/",
  audience: "https://app.retailzero.mvbuilt.com/api",
});

// Enforce bounded authority
if (payload.max_purchase_amount && total > payload.max_purchase_amount) {
  return 403; // bounded_authority_exceeded
}
```

### 3.3 CIBA for `requires_escalation`

When a checkout enters `requires_escalation`, trigger Auth0 CIBA to get buyer approval.

**What to build:**
- Auth0 CIBA configuration (enable in Auth0 Dashboard > Authentication > CIBA)
- CIBA trigger when checkout transitions to `requires_escalation`
- Poll for CIBA approval result
- On approval: transition session to `ready_for_complete` and issue escalation token
- On denial: transition session to `canceled`

**Flow:**
```
1. Agent creates checkout -> status: requires_escalation
2. Server calls Auth0: POST /bc-authorize
   { login_hint: "alex@example.com", binding_message: "Purchase: Heritage Duffle ($269)" }
3. Auth0 sends push notification to buyer
4. Buyer approves on phone
5. Server polls Auth0: GET /oauth/token?auth_req_id=...
6. Auth0 returns access_token with ucp:checkout:complete scope
7. Agent calls POST /checkout-sessions/{id}/complete with escalation token
8. Server validates token, completes checkout
```

### 3.4 Auth0 Actions for Custom Claims

**What to configure:**
- Post-login Action that adds `max_purchase_amount` claim to access tokens based on agent client ID
- Action that adds `ucp_agent_tier` claim for tiered access
- Action that logs UCP-specific audit events

### 3.5 Consent Management

Auth0's consent screen handles scope approval during identity linking. Configure with UCP-specific scope descriptions:
- `ucp:catalog:read` -> "Browse product catalog on your behalf"
- `ucp:checkout:session` -> "Create and manage checkout sessions"
- `ucp:orders:read` -> "View your order history and tracking"
- `ucp:identity:link` -> "Link your RetailZero account"

---

## Tier 4: Google Merchant Center Onboarding

### 4.1 Prerequisites

- [ ] Active Google Merchant Center account
- [ ] Products published with `native_commerce="true"` attribute
- [ ] Return policy published on retailzero.com
- [ ] Customer support contact info published
- [ ] `/.well-known/ucp` serving production manifest
- [ ] All Tier 1 conformance requirements met

### 4.2 Onboarding Steps

1. Publish `/.well-known/ucp` on production domain
2. Ensure product feed has schema.org markup
3. Enroll via Merchant Center UI (Settings > UCP)
4. Google provides your webhook delivery URL
5. Configure webhook URL in server
6. Google runs conformance test suite against your server
7. Fix any failures, re-run until green
8. Google approves for live traffic
9. Monitor via Merchant Center dashboard

### 4.3 Conformance Test Categories (All Must Pass)

1. API binding (REST transport, headers)
2. Checkout lifecycle (state machine transitions)
3. Payment processing (AP2, token handling)
4. Order management (retrieval, status)
5. Fulfillment operations (shipping, tracking)
6. Business logic (totals, discounts)
7. Input validation (malformed requests)
8. Idempotency (request deduplication)
9. AP2 protocol (payment authorization)
10. Simulation security (test mode access)
11. Webhook functionality (delivery, signatures)
12. Error handling (codes, messages)
13. Security (signatures, key management)

**Run locally first:**
```bash
git clone https://github.com/Universal-Commerce-Protocol/conformance
cd conformance
# Configure to point at your server
# Run all 13 test suites
```

### 4.4 Current Availability

- US-based merchants only (as of April 2026)
- Global expansion planned throughout 2026
- Google Pay is the only supported payment method at launch
- PayPal support announced but not yet available

---

## Embedded Checkout Protocol (ECP) -- Optional

If Google wants to embed your checkout UI inside Gemini rather than redirecting, you need ECP support. This is JSON-RPC 2.0 over `postMessage`.

### Required Messages

**Handshake:**
```json
{ "jsonrpc": "2.0", "method": "ec.ready", "params": { "version": "2026-04-08", "delegations": ["payment.credential_request"] } }
```

**Lifecycle:**
```json
{ "jsonrpc": "2.0", "method": "ec.start" }
{ "jsonrpc": "2.0", "method": "ec.complete", "params": { "order_id": "..." } }
{ "jsonrpc": "2.0", "method": "ec.error", "params": { "error": "..." } }
```

**State changes:**
```json
{ "jsonrpc": "2.0", "method": "ec.buyer.change", "params": {...} }
{ "jsonrpc": "2.0", "method": "ec.payment.change", "params": {...} }
{ "jsonrpc": "2.0", "method": "ec.fulfillment.change", "params": {...} }
{ "jsonrpc": "2.0", "method": "ec.totals.change", "params": {...} }
```

ECP is not required for initial launch. You can start with redirect-based checkout and add ECP later.

---

## Implementation Sequence

### Phase 1: Foundation (Week 1-2)
1. Replace in-memory storage with PostgreSQL + Redis
2. Update checkout session schema to full UCP spec (cents, totals, fulfillment)
3. Update `/.well-known/ucp` manifest to production format
4. Add Auth0 JWT validation middleware (`jose` library)
5. Add idempotency storage and middleware

### Phase 2: Security (Week 2-3)
6. Implement RFC 9421 HTTP message signatures (verify inbound, sign outbound)
7. Add Auth0 CIBA integration for `requires_escalation`
8. Add agent profile fetching and capability negotiation
9. Configure Auth0 API scopes and Actions for bounded authority

### Phase 3: Commerce (Week 3-5)
10. Integrate Stripe for payment processing + Google Pay
11. Integrate tax calculation provider
12. Integrate shipping carrier APIs
13. Add inventory management
14. Build webhook delivery system with retry queue

### Phase 4: Conformance (Week 5-6)
15. Run UCP conformance test suite
16. Fix failures iteratively
17. Add simulation mode for testing

### Phase 5: Onboarding (Week 6-7)
18. Set up Google Merchant Center account
19. Publish product feed with native_commerce attribute
20. Submit for Google review
21. Complete Google's conformance validation
22. Go live

---

## Key Resources

- [UCP Specification](https://ucp.dev/specification/overview)
- [Google Merchant UCP Docs](https://developers.google.com/merchant/ucp/)
- [Official JS SDK](https://github.com/Universal-Commerce-Protocol/js-sdk)
- [Official Python SDK](https://github.com/Universal-Commerce-Protocol/python-sdk)
- [Node.js Sample](https://github.com/Universal-Commerce-Protocol/samples/tree/main/rest/nodejs)
- [Conformance Tests](https://github.com/Universal-Commerce-Protocol/conformance)
- [RFC 9421 (HTTP Message Signatures)](https://datatracker.ietf.org/doc/html/rfc9421)
- [Shopify Engineering: UCP Deep Dive](https://shopify.engineering/ucp)
- [Auth0 CIBA Documentation](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow)
