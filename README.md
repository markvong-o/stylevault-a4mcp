# RetailZero: Securing AI Agent Commerce with Auth0

RetailZero is an interactive demo that shows how Auth0 secures AI agents as they browse, transact, and operate on behalf of e-commerce customers. It walks through three progressively sophisticated scenarios -- a 1st-party AI widget, ChatGPT via MCP, and Gemini via UCP -- all protected by a single Auth0 security layer.

The demo tells a cohesive story: RetailZero, a premium e-commerce platform, moved from zero to secured AI commerce in weeks by using Auth0's managed OAuth infrastructure instead of building custom auth from scratch.

## What This Demo Covers

**Scenario A: 1st-Party AI Widget**
RetailZero's own embedded AI assistant connects through a simple consent flow, executes scoped tool calls (wishlist, search, purchase), and hits bounded authority limits on high-value transactions.

**Scenario B: ChatGPT via MCP (Model Context Protocol)**
A third-party AI client discovers RetailZero's MCP server, dynamically registers itself, authenticates the user, and transacts without pre-registration or manual onboarding. Human-in-the-loop approval via CIBA handles sensitive purchases.

**Scenario C: Gemini via UCP (Universal Commerce Protocol)**
An autonomous AI agent discovers RetailZero's merchant manifest, negotiates capabilities via profile exchange, and authenticates requests using HTTP Message Signatures (RFC 9421). Auth0 handles Identity Linking when the agent needs user-specific data. When a checkout exceeds the merchant's agent policy limit, UCP's state machine triggers escalation via `continue_url`, and RetailZero uses Auth0 CIBA behind that URL for buyer approval.

## Auth0 Features in Action

### Discovery and Zero-Friction Onboarding

- **Protected Resource Metadata (RFC 9728):** RetailZero publishes `/.well-known/oauth-protected-resource` so AI clients discover authorization requirements automatically.
- **Authorization Server Metadata (RFC 8414):** Clients fetch Auth0's endpoints, supported scopes, and registration capabilities from a single well-known URL.
- **Dynamic Client Registration (RFC 7591):** New AI clients register on the fly. Auth0 issues a `client_id` immediately without portal delays, support tickets, or developer approval queues.
- **UCP Merchant Manifest:** For autonomous agents, RetailZero publishes `/.well-known/ucp` describing commerce capabilities, endpoints, payment handlers, and authority policies.

### Authentication and Consent

- **OAuth 2.1 with PKCE:** Authorization code grant with proof key for code exchange. Secure for browser-based and native clients without exposing secrets.
- **Passkey / WebAuthn:** Phishing-resistant authentication eliminates password rotation overhead and theft risk entirely.
- **Granular Consent:** Users see exactly what each AI client is requesting. Five MCP scopes (wishlist, products, orders, preferences, purchases) for ChatGPT, or Identity Linking scopes (profile, email) for Gemini's UCP connection. Commerce capabilities in UCP are authorized through capability negotiation, not OAuth consent.

### Authorization and Bounded Authority

- **Scoped Access Tokens:** Each token specifies exactly what the client can do. Infrastructure validates every request against token scopes before the application layer sees it, eliminating authorization logic from the codebase.
- **Bounded Authority Claims (MCP):** A `max_purchase_amount` claim embedded in the MCP access token defines the transaction ceiling. This cryptographic enforcement means prompt injection cannot override a token claim and model hallucination cannot bypass infrastructure-level policy.
- **Merchant Agent Policy (UCP):** For UCP, RetailZero enforces a server-side agent transaction limit. This is a merchant-configured policy, not a token claim. The AP2 (Agent Payments Protocol) handles payment authorization through tokenized, verifiable credentials.
- **CIBA (Client-Initiated Backchannel Authentication):** When a purchase requires human approval, Auth0 sends a push notification to the user's device. The agent initiates; the human authorizes.

### UCP-Specific Security

- **HTTP Message Signatures (RFC 9421):** Agents sign every request with their private key. Merchants verify against the agent's published public key from its UCP profile. This enables permissionless onboarding without shared secrets.
- **Capability Negotiation:** Before any commerce occurs, both sides exchange profiles. Gemini declares what it can do, RetailZero declares what it allows, and only the intersection proceeds. Commerce capabilities are authorized through this negotiation, not OAuth scopes.
- **Agent Identity Validation:** RetailZero verifies the agent's request signature against its published `signing_keys`. Auth0 handles a separate concern: Identity Linking, which connects the agent to a specific user's account.
- **Checkout State Machine:** UCP defines explicit states (`incomplete` > `requires_escalation` > `ready_for_complete` > `completed`). When a checkout exceeds the merchant's agent policy limit, UCP returns `requires_escalation` with a `continue_url` for buyer approval. RetailZero implements buyer approval behind that URL using Auth0 CIBA.
- **Merchant Agent Policy:** RetailZero configures a $250 agent transaction limit as server-side policy. This is enforced by the merchant application, not as a token claim. The limit applies to all agent-initiated checkouts regardless of which agent platform is connected.

## How the Auth Flows Work

### MCP Flow (ChatGPT)

```
1. ChatGPT  -->  /.well-known/oauth-protected-resource   (discover auth requirements)
2. ChatGPT  -->  Auth0 /.well-known/oauth-authorization-server  (discover endpoints)
3. ChatGPT  -->  Auth0 /oidc/register                    (dynamic client registration)
4. ChatGPT  -->  Auth0 /authorize                        (user login + consent)
5. ChatGPT  -->  Auth0 /oauth/token                      (code for tokens)
6. ChatGPT  -->  RetailZero MCP Server                   (tool calls with access token)
```

Every tool call validates the token's scopes, expiry, and bounded authority claims. High-value purchases trigger CIBA for human approval.

### UCP Flow (Gemini)

UCP uses three distinct authentication layers:

```
LAYER 1: Agent-to-Merchant Authentication (HTTP Message Signatures, RFC 9421)
  Gemini signs every request with its private key.
  RetailZero verifies against Gemini's published signing_keys.

LAYER 2: Identity Linking (OAuth 2.0 via Auth0)
  When Gemini needs user-specific data (orders, account info).
  Standard OAuth code grant through Auth0.

LAYER 3: Buyer Approval (continue_url + Auth0 CIBA)
  When a checkout exceeds the merchant's agent policy limit.
  UCP returns continue_url; RetailZero implements Auth0 CIBA behind it.
```

```
1. Gemini   -->  /.well-known/ucp                        (discover merchant manifest)
2. Gemini  <->  RetailZero                               (profile exchange + capability negotiation)
3. RetailZero   verifies Gemini's request signature       (RFC 9421, agent's public key)
4. Gemini   -->  Auth0 /authorize                        (Identity Linking: user login + consent)
5. Gemini   -->  Auth0 /oauth/token                      (Identity Linking tokens)
6. Gemini   -->  RetailZero UCP Endpoints                (signed requests for commerce operations)
7. RetailZero   returns requires_escalation + continue_url (if over merchant policy limit)
8. RetailZero   -->  Auth0 /bc-authorize                 (CIBA buyer approval behind continue_url)
```

Commerce operations (catalog search, checkout creation) are authenticated via HTTP Message Signatures. User-specific operations (order history) additionally require the Identity Linking token from Auth0.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Framer Motion
- **UCP Server:** Hono (lightweight Node.js framework), Zod schema validation
- **Auth:** Auth0 (OAuth 2.1, CIBA, Dynamic Client Registration, Passkeys)

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. The UCP server runs separately on port 3001.

## Demo Structure

The demo is designed as a presenter-driven walkthrough spanning three acts:

| Act | Scenario | Client | Protocol | Duration |
|-----|----------|--------|----------|----------|
| 1 | RetailZero AI + ChatGPT | 1st-party widget + ChatGPT | MCP | ~4 min |
| 2 | Gemini | Gemini | UCP | ~3 min |
| 3 | Closing | -- | -- | ~1 min |

Each act includes an "Under the Hood" panel with two views:
- **Business View:** Plain-language explanations of what is happening and why it matters
- **Technical View:** HTTP requests, decoded JWT claims, tool call sequences, and token structure

Presenter scripts are available in `demo.md`, `demo-mcp.md`, and `demo-ucp.md`.

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/scenario.ts` | All scenario definitions (steps, security events, tool calls) |
| `src/lib/types.ts` | TypeScript interfaces for state, steps, and security events |
| `src/components/demo/DemoContent.tsx` | Main orchestrator component |
| `src/components/clients/ClientBShell.tsx` | ChatGPT UI simulation |
| `src/components/clients/ClientGeminiShell.tsx` | Gemini UI simulation |
| `src/components/clients/RetailZeroWidget.tsx` | 1st-party AI widget |
| `src/components/demo/SecurityOverlay.tsx` | Under the Hood panel |
| `ucp-server/` | Standalone UCP server (Hono + Zod) |

## Why This Matters

Every commerce brand faces the same question: how do you let AI agents transact on behalf of customers without losing control?

Building this from scratch demands engineering OAuth servers, consent management, backchannel authentication, fine-grained permissions, transaction limits, and audit logging. Each component is a separate build, each one a potential security gap. That easily becomes 3-6 months of infrastructure work before a single AI agent can safely place an order.

Auth0 compresses that timeline to weeks. The security layer is managed infrastructure, not custom code. Consent, CIBA, bounded authority, and audit trails ship as configuration, not engineering projects. You remove months of development work and the operational overhead of maintaining authentication infrastructure in production.

The compounding advantage is what matters most. When ChatGPT connects today and Gemini connects tomorrow, they inherit the same security posture automatically. The marginal cost of onboarding each new AI platform approaches zero. While competitors are still scoping their auth architecture, teams using Auth0 are already live across multiple AI channels.

That is the structural advantage Auth0 delivers for agentic commerce: lower operational cost, faster time to market, and security that scales with every new AI platform.
