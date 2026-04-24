# RetailZero MCP Demo - Developer Onboarding Guide

## Project Overview

**RetailZero** is an interactive, presenter-driven demo that shows how Auth0 secures AI agents conducting e-commerce transactions. It walks through three progressively sophisticated security scenarios:

1. **Act 1 (ChatGPT + MCP):** 1st-party RetailZero AI widget + ChatGPT via Model Context Protocol
2. **Act 2 (Gemini + UCP):** Gemini via Universal Commerce Protocol
3. **Act 3 (Advanced Gemini MCP):** Advanced Gemini MCP integration

The business story: RetailZero, a premium e-commerce platform, moved from zero to secured AI commerce in weeks using Auth0's managed OAuth infrastructure instead of building custom auth from scratch. Each scenario is interactive with user gates (consent, CIBA approval, login) that branch the demo flow. An "Under the Hood" overlay shows real backend logs synced via Server-Sent Events (SSE), revealing OAuth tokens, API requests, and auth decisions.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19, TypeScript 5 | Full-stack app + browser rendering |
| Styling | Tailwind CSS 4, Framer Motion | Design + animations |
| Backend (API) | Express, Hono, Node.js | MCP server + UCP routes |
| Auth Protocols | MCP SDK 1.29.0, UCP (RFC 9421) | AI agent integrations |
| Auth Provider | Auth0 | OAuth 2.1, CIBA, Dynamic Registration, Passkeys |
| Persistence | Redis (optional), in-memory | Event logs, demo data, catalog |
| Validation | Zod | Schema validation |
| JWT | Jose | Token verification |

---

## Project Structure

```
retailzero-mcp-demo/
├── src/                          # Frontend (Next.js + React)
│   ├── app/                      # Next.js app router pages
│   │   ├── page.tsx              # Home page - renders <DemoShell />
│   │   └── architecture/         # Visual architecture page
│   ├── components/
│   │   ├── demo/
│   │   │   ├── DemoContent.tsx   # Main demo orchestrator (acts, steps, gates)
│   │   │   ├── SecurityOverlay.tsx # "Under the Hood" panel
│   │   │   └── SecurityEventCard.tsx # Individual security event card
│   │   └── clients/
│   │       ├── ClientBShell.tsx   # ChatGPT simulator (dark theme)
│   │       ├── ClientGeminiShell.tsx # Gemini simulator
│   │       └── RetailZeroWidget.tsx  # 1st-party embedded widget
│   ├── hooks/
│   │   └── useDemoLiveCalls.ts   # SSE connection for real-time event sync
│   └── lib/
│       ├── scenario.ts           # All demo steps, security moments, gate logic
│       ├── demo-context.tsx      # Global state (React Context + useReducer)
│       └── types.ts              # TypeScript type definitions
├── server/                       # Backend (Express + Hono)
│   ├── index.ts                  # HTTP server entry, SSE handler, route setup
│   ├── auth.ts                   # UCP authentication middleware (RFC 9421)
│   ├── well-known.ts             # UCP discovery (/.well-known/ucp)
│   ├── catalog.ts                # In-memory product catalog
│   ├── checkout.ts               # Checkout state machine
│   ├── orders.ts                 # Order history
│   ├── redis.ts                  # Optional Redis client
│   └── mcp/
│       ├── server.ts             # MCP session manager + transport
│       ├── tools.ts              # MCP tools (search_products, place_order, etc.)
│       ├── auth.ts               # JWT verification against Auth0 JWKS
│       └── event-bus.ts          # Event emitter + persistence (Redis or in-memory)
├── ucp-server/                   # Standalone UCP server (separate deployment)
│   └── scripts/                  # Auth0 provisioning scripts
├── .env.example                  # Environment variable template
├── AUTH0_SETUP.md                # Auth0 configuration walkthrough
├── REDIS.md                      # Redis persistence setup
├── demo.md                       # Presenter script (what to say during each act)
├── demo-mcp.md                   # ChatGPT-specific presenter notes
└── demo-ucp.md                   # Gemini-specific presenter notes
```

---

## Key Files to Read First

Start with these files in order. They cover 80% of what you need to understand the system.

| Priority | File | What It Does |
|----------|------|-------------|
| 1 | `src/lib/types.ts` | All TypeScript types - DemoState, DemoStep, SecurityEvent, ChatMessage, MockToken |
| 2 | `src/lib/scenario.ts` | The heart of the demo - all steps, conversations, security moments, and gate logic are defined here as data |
| 3 | `src/lib/demo-context.tsx` | Global state management via React Context + useReducer. The `useDemoState()` hook powers everything |
| 4 | `src/components/demo/DemoContent.tsx` | Main orchestrator - manages acts (0-4), step transitions, gate decisions, overlay visibility |
| 5 | `server/index.ts` | Server entry point - HTTP routing, SSE stream at `/api/events/stream`, event endpoints |
| 6 | `server/mcp/tools.ts` | MCP tool implementations - search_products, place_order, view_wishlist with scope-based auth |
| 7 | `server/mcp/event-bus.ts` | Event emitter that persists to Redis or in-memory, drives the real-time overlay |
| 8 | `src/hooks/useDemoLiveCalls.ts` | SSE client hook - connects frontend to backend event stream |

---

## Architecture

### How the Demo Flows

```
Act 0 (Intro)
    |
Act 1 (ChatGPT + MCP) --> Multiple Conversations --> Steps per Conversation
    |
Act 2 (Gemini + UCP) --> Multiple Conversations --> Steps per Conversation
    |
Act 3 (Advanced Gemini) --> Multiple Conversations
    |
Act 4 (Closing) --> Reset
```

Within each Act:
- `computeEffectiveSteps()` checks gate decisions to determine which steps are visible
- If a gate is denied, the denial branch steps are shown instead
- Presenter clicks "Next" to advance through steps

### Real-Time Event Sync (SSE)

```
Backend Event Bus (server/mcp/event-bus.ts)
    |  (Redis or in-memory)
    v
SSE Stream (/api/events/stream)
    |
    v
useDemoLiveCalls Hook (frontend)
    |
    v
syncSecurityEvents() --> DemoContext state
    |
    v
SecurityOverlay renders events in real-time
```

### Key Architectural Patterns

**Data-Driven Scenarios** - All demo content lives in `scenario.ts` as structured data. Adding or modifying steps means editing data, not writing component logic.

**Dual-View Overlay** - The "Under the Hood" panel shows both a business view (plain-language explanation) and a technical view (decoded JWT, request/response, OAuth claims).

**Bounded Authority Enforcement** - MCP tool checks token for `$250 max_purchase_amount` claim. This is enforced at the tool level, not just in the token. Prompt injection cannot override a cryptographic token claim.

**Permissionless UCP Onboarding** - Gemini discovers RetailZero via `/.well-known/ucp`. No pre-registration required. Agent signs requests with RFC 9421 HTTP Message Signatures.

---

## Auth0 Features Demonstrated

| Feature | Where in Demo | Why It Matters |
|---------|--------------|---------------|
| Dynamic Client Registration | MCP scenario step | ChatGPT self-registers without pre-approval |
| OAuth 2.1 + PKCE | MCP auth flow | Secure for native/web clients without secrets |
| Passkey/WebAuthn | Login security moment | Phishing-resistant authentication |
| Bounded Authority Claims | MCP token + tool check | $250 limit enforced cryptographically |
| CIBA (Backchannel Auth) | High-value purchase gate | Push notification to user device for approval |
| Identity Linking | UCP Gemini scenario | Agent links to user account for order history |
| HTTP Message Signatures | UCP agent requests | Permissionless agent onboarding via key verification |
| Scoped Access Tokens | MCP tool authorization | Each token specifies exactly what the LLM can do |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Redis (optional, for event persistence)

### Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Auth0 credentials (or leave as-is for demo mode)

# 3. Run in development
npm run dev
# App runs at http://localhost:3000

# 4. (Optional) Provision Auth0 resources
npm run setup:chatgpt   # MCP resources
npm run setup:ucp        # UCP resources + database

# 5. (Optional) Start Redis for event persistence
brew install redis && brew services start redis
# or: docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Environment Variables

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.stylevault.com
AUTH0_CLIENT_ID=<mcp-client-id>
AUTH0_CLIENT_SECRET=<mcp-client-secret>
AUTH0_UCP_CLIENT_ID=<ucp-client-id>
AUTH0_UCP_CLIENT_SECRET=<ucp-client-secret>
CIBA_ENABLED=false
PORT=3000
REDIS_URL=redis://127.0.0.1:6379   # optional
```

> **Note:** Auth0 configuration is optional. The demo runs in "demo mode" if `AUTH0_DOMAIN` is not set or is a placeholder. All data is in-memory without Redis.

---

## Common Tasks

### Add a New Demo Step

Open `src/lib/scenario.ts` and add a `DemoStep` object to the appropriate scenario's steps array:

```typescript
{
  id: "a-new-step",
  type: "chat",
  chat: {
    id: "chat-1",
    role: "assistant",
    content: "Your message here",
    timestamp: "10:00:05"
  }
}
```

### Add a Security Event to the Overlay

In a scenario step, add a `securityEvent` property:

```typescript
securityEvent: {
  id: "evt-new",
  timestamp: "10:00:06",
  type: "tool-call",
  result: "granted",
  scenarioId: "scenario-a",
  shortDescription: "ChatGPT called search_products...",
  businessDescription: "ChatGPT searched for 'blazer' on RetailZero",
  technicalDetail: {
    protocol: "MCP tool call",
    request: "POST /mcp body: {...}",
    response: "200 OK: [{...}]"
  }
}
```

### Add or Modify an MCP Tool

Open `server/mcp/tools.ts`, add a new tool in `registerTools()`, and emit a `tool-result` event to the eventBus. Restart the server.

### Change the $250 Purchase Limit

Update `MAX_AGENT_PURCHASE` in `server/mcp/tools.ts` and the matching constant in `server/checkout.ts`.

---

## Debugging

### Frontend
- **React DevTools:** Inspect DemoContext state and component hierarchy
- **Network tab:** Check `/api/events/stream` for active SSE connection
- **Hot reload:** Any `.tsx` file change refreshes immediately in dev mode

### Backend
- **Server logs:** Watch for event emissions, token verification, tool calls
- **SSE test:** `curl -N http://localhost:3000/api/events/stream`
- **Event push test:** `curl -X POST http://localhost:3000/api/events -H 'Content-Type: application/json' -d '{"type":"test"}'`

### Auth0
- **Auth0 Dashboard > Logs:** Check for auth events if using real Auth0
- **JWT inspection:** Copy tokens from SecurityEventCard technical view, paste into jwt.io
- **JWKS endpoint:** `https://<tenant>.us.auth0.com/.well-known/jwks.json`

### Common Issues

| Issue | Fix |
|-------|-----|
| SSE connection drops | Check Redis config or remove `REDIS_URL` to use in-memory. Restart server. |
| MCP tools return "Authentication required" | If `AUTH0_DOMAIN` is a placeholder, demo mode skips auth. If real, check the bearer token. |
| Scenario steps not advancing | A gate decision may be blocking. Open the "Under the Hood" overlay to check. |
| Events not in overlay | Verify SSE connection in Network tab. Check `useDemoLiveCalls` hook for errors. |

---

## Reference Documentation

| Document | Purpose |
|----------|---------|
| `AUTH0_SETUP.md` | Step-by-step Auth0 configuration |
| `CHATGPT_MCP_INTEGRATION_GUIDE.md` | ChatGPT-specific integration details |
| `UCP_INTEGRATION_GUIDE.md` | Gemini-specific integration details |
| `REDIS.md` | Event persistence setup |
| `demo.md` | Presenter script for the full demo |
| `demo-mcp.md` | Presenter notes for MCP scenarios |
| `demo-ucp.md` | Presenter notes for UCP scenarios |

---

## TL;DR

RetailZero is a **data-driven presenter demo**. The core mechanic is:

1. **Scenario definitions** (`scenario.ts`) store all demo content as structured data
2. **Frontend orchestrator** (`DemoContent.tsx`) renders steps based on act/step position
3. **Gates** (user decisions) branch the flow at security moments
4. **Backend servers** (MCP + UCP) provide realistic OAuth/UCP endpoints
5. **Event bus** syncs backend activity to the frontend overlay in real-time

Most customization happens in scenario definitions. Start there.
