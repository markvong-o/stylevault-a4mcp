# Auth0 for MCP: ChatGPT + RetailZero Demo

Duration: ~5 minutes


## Setup

"This is RetailZero, a premium e-commerce platform. Every commerce brand is asking the same question now: how do we let AI assistants like ChatGPT shop securely on behalf of our customers?"

"Auth0 for MCP answers that. What you're about to see is what happens when a third-party AI client connects, authenticates, and transacts, all secured out of the box."

Click Start Demo. Select the ChatGPT scenario.


## Discovery and Dynamic Registration

"ChatGPT has never connected to RetailZero before. There's no pre-registration required, no API keys to exchange, no portal onboarding. So how does it connect?"

"Two things happen automatically. ChatGPT queries RetailZero's MCP server for its protected resource metadata. That metadata points to Auth0 as the authorization server. ChatGPT then fetches Auth0's server metadata to learn what scopes are available and where to register."

"From there, ChatGPT registers itself dynamically. Auth0 issues a client_id on the spot with no manual setup required, no tickets created, and no waiting for a developer to whitelist a new integration."

"That's your zero-friction onboarding model. A new AI platform shows up tomorrow and connects through the same flow. The operational cost of adding a new AI channel drops to near zero."

Click through discovery and DCR system messages.


## Authentication and Consent

Click Approve on the passkey login.

"Alex authenticates with a passkey through Auth0 Universal Login. It's phishing-resistant with no passwords to steal, and at this point it's table stakes for any serious auth implementation."

Click to the consent screen.

"This is where user control actually lives. Alex sees exactly what ChatGPT is requesting: OAuth 2.1 scopes covering wishlist access, product search, shopping cart management, checkout, preference updates, and order history. The user decides what the AI can do, not the developer, not the model. Auth0 enforces those boundaries on every request that follows."

Click Approve.


## Token Exchange: Security Established

"After consent, ChatGPT exchanges the authorization code for tokens. This is where security posture gets locked in."

Show the Under the Hood panel. Select the Technical tab.

"Two tokens come back. The access token carries the scopes Alex approved and ChatGPT's identity. The ID token proves who logged in: Alex Morgan, verified email, session timestamp."

"Both are cryptographically signed JWTs. The scopes are stated explicitly in the claims, so there's no ambiguity about what this token authorizes. Any cart checkout above $100 triggers a CIBA step-up regardless of the granted scopes, so the human stays in the loop for high-value transactions."

Click through the Access Token and ID Token claim tabs.

"From here on, every tool call is validated against these claims. Auth0 enforces scopes, token validity, and transaction limits at the infrastructure layer. The application doesn't have to build any of this."

Switch to the Business tab.

"For business stakeholders: ChatGPT has time-limited, scoped access with no permanent keys, no hardcoded credentials. Every request is validated and auditable."


## Browsing and Shopping

Click through conversations 1 and 2.

"Alex browses the wishlist and searches for leather bags under $300. Every tool call is validated against the token's scopes and the server performs an RFC 8693 token exchange behind the scenes, so each call runs under a narrow, short-lived token scoped to just that operation."


## Cart and Checkout with CIBA Approval

Click to conversation 3.

"Alex adds the Heritage Duffle ($269) to the cart via the add_to_cart tool, reviews the cart with view_cart, then asks ChatGPT to check out. The cart total is over the $100 auto-approval threshold, so checkout_cart triggers an Auth0 CIBA push notification to Alex's device. ChatGPT receives an auth_req_id and waits. The AI initiates; the human authorizes."

"This is human-in-the-loop at scale. No custom notification infrastructure required. Auth0 handles backchannel authentication, polling, and token issuance automatically."

Click Approve.

"ChatGPT calls complete_ciba_checkout with the auth_req_id, the poll returns a bearer token, and the order is finalized. The entire flow (tool calls, token exchange, CIBA approval, order placement) is logged and auditable."


## Threshold Gating: Enforcement Without Friction

Click to conversation 5.

"Now the key moment. Alex asks ChatGPT to check out a cart worth $2,400. ChatGPT has the execute:purchase scope. The request syntax is valid. Watch what happens."

"Every cart checkout above $100 routes through CIBA. The MCP server sends the push to Alex's enrolled device, describes the exact amount and vendor in the binding message, and refuses to finalize until the user approves on their own device. No prompt injection can forge a CIBA approval, and no model hallucination bypasses the step-up path."

"ChatGPT explains what the user needs to approve, surfaces the binding message, and waits. The human stays in control at the moment it matters most."


## The Business Case

"Think about what RetailZero didn't have to build: OAuth servers, consent management, backchannel auth, fine-grained permissions, transaction limits, and audit logging. Without Auth0, each of those is a separate engineering effort and a potential security gap."

"With Auth0, all of that is managed infrastructure. RetailZero went from zero to a secured MCP server in weeks, not quarters. And because the security layer is configured once, every new AI client that connects inherits the same posture automatically. ChatGPT connects today, Claude connects tomorrow, vertical agents connect next quarter, and the marginal cost of each new channel is near zero."

"That combination of lower operational cost and faster go-to-market is the structural advantage. While competitors are still designing their security layer, RetailZero is already transacting across multiple AI platforms."


## Handling Questions

**Can the user revoke access?**
At any time. Tokens become invalid immediately. Sessions clean up automatically.

**What if ChatGPT hallucinates a tool call?**
Server-side validation on every request. Without a valid scoped token that passes bounded authority checks, nothing executes. The AI cannot bypass infrastructure-layer enforcement.

**How does Dynamic Client Registration work in practice?**
An MCP-compatible client sends a registration request to Auth0. Auth0 validates, issues a client_id, and the client proceeds through the standard OAuth flow. No manual setup. Scales to any number of AI clients.

**What about rate limiting and abuse?**
Tokens are time-limited and scoped, and bounded authority caps transaction values. Together, these controls limit the blast radius of any compromised or misbehaving client.

**How long did this take to implement?**
Weeks. Auth0 provides consent, CIBA, and token infrastructure as managed services. Most integration time goes into the MCP connector and authority policy definition.

**What about the audit trail?**
Complete logging on every token exchange, API call, CIBA approval, and authority decision. Compliance-ready out of the box.
