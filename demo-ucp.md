# Auth0 for UCP: Gemini + StyleVault Demo

Duration: ~5 minutes


## Setup

"This is StyleVault, a premium e-commerce platform. We've seen how Auth0 secures AI assistants that operate in a user's session. But the next wave isn't AI in the loop. It's autonomous agents that shop, compare, and transact independently, without human approval for every action."

"That's what UCP (Universal Commerce Protocol) solves. Google is backing this standard, and Auth0 integrates at the identity layer. Today we show what autonomous agent commerce looks like when you actually control the risk."

Click Start Demo. Select the Gemini scenario.


## UCP Discovery and Capability Negotiation

"Gemini discovers StyleVault's UCP Merchant Manifest at /.well-known/ucp. Unlike MCP, this manifest doesn't just list endpoints. It describes commerce capabilities using reverse-domain naming (dev.ucp.shopping.checkout, dev.ucp.shopping.catalog), payment handlers, and the merchant's public signing keys."

Click through the manifest discovery system message.

"Then both sides exchange capability profiles. Gemini publishes its own UCP profile with its capabilities and signing keys. StyleVault fetches that profile, verifies Gemini's identity using HTTP Message Signatures (RFC 9421), and computes the intersection of supported capabilities. That negotiation determines what Gemini can actually do before any commerce begins."

"This is a fundamental difference from MCP. Agent authentication here uses cryptographic request signatures, not OAuth tokens. Gemini signs every request with its private key. StyleVault verifies against the agent's published public key. No shared secrets, no pre-registration, no API keys to rotate."

Click through the profile exchange and UCP Discovery Gate.

"Auth0's role comes in at the identity layer, not the agent authentication layer. UCP handles agent-to-merchant trust through request signatures. Auth0 handles a different concern: connecting the agent to the user's account."


## Authentication and Consent (Identity Linking)

Click Approve on the passkey login.

"Alex authenticates with a passkey through Auth0 Universal Login, which is phishing-resistant and eliminates passwords entirely."

Click Approve on consent.

"The consent screen shows Identity Linking scopes: profile access, email, and persistent session. This is specifically the dev.ucp.shopping.identity capability. Auth0 handles user identity so Gemini can act on Alex's behalf for user-specific operations like order history."

"Commerce capabilities (catalog search, checkout) are authorized separately through UCP's capability negotiation. They don't require OAuth consent because the agent authenticates those requests via HTTP Message Signatures."


## Token Exchange: Identity Linking

Show the Under the Hood panel. Select the Technical tab.

"Standard OAuth flow: authorization code for tokens. But notice what the token contains. It has identity scopes (openid, profile, email), not UCP capability names. This token is specifically for Identity Linking, connecting Gemini's actions to Alex's StyleVault account."

"Agent-to-merchant authentication happens separately through request signatures. That's why you don't see ucp:catalog:read or ucp:checkout:session in the token. Those capabilities were authorized during capability negotiation and are verified cryptographically on every request."

Click through the Access Token and ID Token claim tabs.

"The ID token carries Alex's identity for account linking. Gemini never stores or sees credentials. It only has Identity Linking tokens for user-specific operations."

Switch to the Business tab.


## Autonomous Catalog Search

Click through to the catalog search conversation.

"Gemini searches the catalog for leather bags under $300. Notice in the technical view: there's no OAuth token exchange for this operation. Gemini authenticates via HTTP Message Signature. StyleVault verifies the signature against Gemini's public key and serves the catalog results. That's the operational efficiency of autonomous agents: request signatures eliminate token exchange overhead for every API call."


## Checkout with Escalation

Click to the checkout conversation.

"Gemini starts checkout for the Heritage Duffle at $269. This exceeds StyleVault's $250 agent transaction policy. Instead of rejecting, the backend returns requires_escalation with a continue_url."

"This is UCP's state machine: incomplete, requires_escalation, completed. When the agent hits the merchant's policy boundary, it escalates rather than fails. The continue_url points to StyleVault's buyer approval flow. Behind that URL, StyleVault uses Auth0 CIBA to send a push notification to Alex's device."

Click Approve on the CIBA notification.

"Alex approves, StyleVault issues an escalation token, Gemini completes the checkout with that token, and the session moves to completed. The entire escalation flow is captured in the audit trail."

"This is where Auth0 and UCP work together. UCP defines the escalation mechanism (continue_url). Auth0 powers the buyer approval behind it (CIBA). The merchant controls which identity provider handles the approval."


## Order Tracking

Click to the order tracking conversation.

"Post-purchase, Gemini tracks the order. This is user-specific data, so it requires both the Identity Linking token from Auth0 and the HTTP Message Signature. Two authentication layers working together: the signature proves the agent's identity, the OAuth token proves which user the agent is acting for."


## Bounded Authority (Merchant Policy)

Click to the final conversation.

"Gemini attempts a $2,400 watch purchase. StyleVault's merchant policy limits agent transactions to $250. The request is blocked before it reaches the checkout engine. This is server-side policy enforcement, not a token claim. The merchant configures the limit, and it applies to all agent-initiated checkouts regardless of which agent platform is connected."

"Even though this isn't enforced through the token itself, the effect is the same: the agent cannot override a server-side policy through prompt injection or model behavior. Gemini recognizes the limit and asks Alex to complete the purchase directly."


## The Business Case

"UCP with Auth0 solves an urgent problem: how do you let autonomous AI agents transact on behalf of customers while retaining control?"

"The answer is layered security. UCP handles agent-to-merchant trust through HTTP Message Signatures and capability negotiation. Auth0 handles user identity through Identity Linking and buyer approval through CIBA. The merchant configures agent policies server-side. Each layer does what it's built for."

"Build this yourself and you're engineering months of infrastructure: request signature verification, capability negotiation, OAuth identity linking, CIBA escalation, merchant policy enforcement, audit trails. All from scratch. And the UCP spec keeps evolving, so you're chasing a moving target."

"With Auth0 handling the identity layer, StyleVault configured policies, connected endpoints, and shipped in weeks, not months. The security posture is built in. When Gemini connects, Claude, or the next agent platform arrives, the infrastructure absorbs it. Zero marginal cost for the identity layer."


## Handling Questions

**How is UCP different from MCP?**
MCP assumes a human actively controlling the AI in a session. UCP assumes autonomous operation within policy limits. UCP adds capability negotiation, HTTP Message Signatures for agent authentication, and escalation state machines that MCP doesn't have. MCP uses OAuth tokens for all operations; UCP uses request signatures for commerce and OAuth only for Identity Linking.

**How does agent authentication work in UCP?**
Agents sign every request using HTTP Message Signatures (RFC 9421). The agent's public key is published in its UCP profile. Merchants verify the signature against that key. No shared secrets, no API keys. This is separate from OAuth, which handles user identity.

**Where does Auth0 fit in UCP?**
Auth0 handles two things: (1) Identity Linking, the OAuth 2.0 flow that connects an agent to a user's account, and (2) buyer approval behind the continue_url, using CIBA to verify the buyer's identity when a checkout exceeds the merchant's agent limit.

**What is the $250 limit?**
A merchant-configured policy that StyleVault enforces server-side on all agent-initiated checkouts. It's not a token claim. The merchant controls the limit and can adjust it per agent, per user, or per transaction context.

**Can the $250 limit change per user or agent?**
Yes. StyleVault's policy engine can set different limits based on the agent, user, or transaction context. A trusted agent with a track record gets higher limits than a newly registered one.

**What if the CIBA notification fails?**
The session stays in requires_escalation. It doesn't proceed. The agent can retry or inform the user through chat. No transaction completes without explicit approval above the merchant's policy boundary.

**Does UCP work with other agents?**
Any agent implementing the UCP protocol can connect. Auth0 secures the identity layer on the merchant side. Capability negotiation ensures compatibility before commerce begins.

**What about audit trails?**
Complete. Every discovery, negotiation, request signature verification, Identity Linking token exchange, state transition, CIBA approval, and policy decision is logged. Full transaction reconstruction for compliance.
