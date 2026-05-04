# Auth0 for MCP: Live Playground + Claude Desktop Demo

Duration: ~8 minutes

Audience: technical buyers and architects evaluating Auth0 as the security layer for AI commerce. This is the "real tokens, real tenant, real MCP client" demo. The other demo-mcp.md script walks the canned ChatGPT scenario for a less technical audience.


## What You'll Need

Before you start, confirm:

- The RetailZero app is running on a public HTTPS URL (Vercel prod or tunnel).
- `AUTH0_DOMAIN`, `AUTH0_MCP_AUDIENCE`, `AUTH0_AUDIENCE`, and `AUTH0_CIBA_CLIENT_ID` / `AUTH0_CIBA_CLIENT_SECRET` are set.
- A test user (Alex) is enrolled in Auth0 Guardian on a phone you can reach during the demo.
- Claude Desktop is installed and signed in.
- Two browser windows staged: one on `/playground/live`, one on the Auth0 tenant logs dashboard.


## Framing

"Every commerce brand is asking the same question right now: how do we let AI assistants shop on behalf of our customers without opening a hole in our security model?"

"There are two answers to that question. The first is 'we'll build it ourselves,' which is a multi-quarter project across OAuth, consent, fine-grained permissions, step-up auth, and audit. The second is Auth0 for MCP, where the security layer is managed infrastructure. Every new AI client that connects inherits the same posture automatically, with no new code."

"I'm going to show you both halves of that second answer. First the live playground, which is our authenticated front door into the MCP server. Then I'll connect Claude Desktop as a real third-party client without touching the code, and run the same flows from there."


## Act 1: The Live Playground – Anonymous Landing

Navigate to `/playground/live` in a fresh incognito window.

"This is the live MCP playground. Two things stand out. First, I'm not logged in. This is a public route, so a partner, prospect, or engineer can land here and understand the integration shape before committing. Second, there's no 'log in' button in the navbar. Auth happens at the moment of intent, not as a speed bump on the way in."

Point at the center column.

"Starting a session is the one call to action. Clicking it does exactly what an AI client does: it asks Auth0 for an access token scoped to the MCP Tools API."

Click **Sign in and Initialize**.


## Act 2: The Auth0 Round-Trip

Auth0 Universal Login appears.

"This is Auth0 Universal Login. It's passkey-first and phishing-resistant, which takes the password out of the attack surface entirely. By 2026 that's table stakes, so what matters more is what happens after login."

Authenticate as Alex.

Consent screen appears.

"Here is where user control actually lives. Alex sees the scopes the playground is requesting, covering wishlist read and write, cart read and write, order history, and checkout. These OAuth 2.1 scopes are defined once in Auth0 and enforced on every call, which means the user decides what the AI can do. That authority never transfers to the developer or the model."

Click **Accept**.

Page redirects back to `/playground/live`.

"The session initialized automatically without asking for a second click. The token came back, the MCP session handshake ran, and the tools list populated. That's the difference between 'auth integrated' and 'auth thought through.'"

Point at the session pill in the tools column.

"The session ID is bound to the access token. Every subsequent tool call carries that token, and Auth0 verifies it on every hit. That continuous validation keeps the blast radius minimal if a token leaks."


## Act 3: A Public Tool Call

In the tools column, click **search_products**.

"search_products is a public tool. No scope required because browsing a catalog doesn't need user authority. Auth0's RBAC model lets you scope only the operations that actually need scoping, which keeps the consent screen honest and your friction down."

Fill in `query: leather bags`, click **Call Tool**.

Pretty view shows the parsed product list.

"Result view defaults to 'Pretty' and unwraps the JSON-RPC envelope so the payload is readable. Toggle to 'Raw' to see the MCP transport shape underneath."

Click **Raw**, then back to **Pretty**.

Point at the event stream on the right.

"Every step is logged in real time as the token is verified, the tool runs, and the result comes back. This is the audit trail your compliance team will ask for, and Auth0 and the MCP server produce it automatically. That's leverage on headcount."


## Act 4: A Scoped Tool Call

Click **get_wishlist**. Click **Call Tool**.

"get_wishlist requires the `read:wishlist` scope. Under the hood, the MCP server performs an RFC 8693 token exchange against the Resource API audience and gets back a narrow, short-lived token scoped to just wishlist reads. The original token never leaves the server, and the resource API never sees the broad MCP token. That's the principle of least privilege enforced at the infrastructure layer."

Point at the event stream.

"You can see the token exchange hop here. The flow issues two tokens against two audiences for the same user, and that separation is what lets you add a new downstream service later without widening the blast radius of the original token. Scope creep stays contained."


## Act 5: Cart and Checkout Under the Threshold

Click **add_to_cart**. Product ID: `sneakers_canvas_001`. Call.

Click **view_cart**. Call.

"Canvas Sneakers at $89, a single line item with the total sitting under $100."

Click **checkout_cart**. Call.

Result shows order confirmation.

"Under $100, checkout auto-approves. The threshold is merchant policy, configured on the server. No second channel required for low-risk transactions. Friction at $89 is lost conversion."


## Act 6: Cart and Checkout Above the Threshold – CIBA

Click **add_to_cart**. Product ID: `bag_heritage_001`. Call.

Click **checkout_cart**. Call.

Result shows `step_up_required` with `auth_req_id`.

"Heritage Duffle at $269, which crosses the threshold. The MCP server calls Auth0's CIBA backchannel authorization endpoint using Alex's `sub` claim as the login hint, and Auth0 pushes a signed binding message to the Guardian app that describes the exact amount and merchant. The response back to the playground is `step_up_required` paired with an `auth_req_id`, and crucially no token is issued until the human approves."

Pick up the phone. Alex's Guardian app shows the push.

"The binding message is specific: $269.00 at RetailZero. Alex can read exactly what they're approving, and if prompt injection tried to trick the AI into checking out something else, the amount and merchant on this screen would give it away. This is defense in depth, where the scope grants the capability to purchase while CIBA controls the magnitude."

Approve on the phone.

In the playground, click **complete_ciba_checkout**. Paste the `auth_req_id`. Call.

Result shows order confirmation.

"The poll returns an approval, the server finalizes the order against the cart snapshot it took when the push went out. The human stayed in the loop at the moment it mattered, without the merchant shipping push notification infrastructure. That's managed infrastructure accelerating your go-to-market."


## Act 7: Reinitialize – Force a Fresh Login

Point at the **Reinitialize Session** button next to the title.

"This button drives a full re-auth through Auth0 with `prompt=login`. Use it to demo a different user segment or to refresh an expiring token without state drift. One click sends you back to Universal Login and returns you with a new session."

Optionally click it and log back in as a different test user to show scope differences.


## Act 8: Connecting Claude Desktop

Switch to Claude Desktop.

"The playground is our front door. The real value shows up when a third-party AI client connects for the first time with zero configuration on our side."

Open Claude Desktop settings → Connectors → Add custom connector.

"I'm adding the MCP server URL. There's no API key to exchange, no pre-registered client to configure, and no ticket waiting in a developer portal."

Paste `https://<your-host>/mcp` and save.

"Watch what happens."


## Act 9: Discovery and Dynamic Client Registration

Claude hits `/mcp`, receives 401 with WWW-Authenticate.

"The first hit returns a 401. That response carries a WWW-Authenticate header pointing Claude at the protected resource metadata document."

Claude fetches `/.well-known/oauth-protected-resource`.

"That's RFC 9728 at work. Claude now knows which Auth0 tenant to authenticate against and which scopes are available, and this document replaces what used to be hard-coded OAuth configuration in every integration."

Claude fetches Auth0's `/.well-known/openid-configuration` and posts to the registration endpoint.

"That's RFC 7591 Dynamic Client Registration. Auth0 issues Claude its own client ID on the spot with no manual onboarding, no ticket queue, and no developer sign-off gating the registration. That's the 'marginal cost per new AI client approaches zero' line in the pricing deck, and this is what makes it real."


## Act 10: Consent in Claude

Claude opens a browser tab for Auth0 Universal Login.

Authenticate as Alex again.

Consent screen appears, now showing Claude as the requesting client.

"The consent flow matches the playground exactly. Auth0 surfaces the same scopes and enforces the same policy whether the client is a pre-registered playground app or a brand-new dynamically registered Claude Desktop client. Policy is decoupled from client identity."

Click **Accept**.

Claude Desktop returns to the conversation. Tools appear.

"Tools are live. From Claude's perspective, it picked up a new capability. From your perspective, no code shipped to make this work."


## Act 11: Driving the Full Flow from Claude

In Claude, type:

> "Search RetailZero for leather bags under $300, then add the Heritage Duffle to my cart."

Claude calls `search_products`, then `add_to_cart`. Observe the calls landing on the MCP server (you can tail Vercel logs or watch the Auth0 logs dashboard).

> "Check out my cart."

Claude calls `checkout_cart`. The $269 total triggers CIBA. Alex's phone buzzes.

"Notice that the flow and enforcement are identical to what we saw in the playground. Auth0 gates at the infrastructure layer, which is why the AI client never gets to shape the security posture. A model hallucination cannot bypass the check, and prompt injection cannot forge the CIBA approval."

Approve on the phone. Claude polls `complete_ciba_checkout` and shows the confirmation.


## Act 12: The Audit View

Switch to the Auth0 logs dashboard.

"Every step is here, from the initial token issuance for the playground through the DCR registration for Claude Desktop and every token exchange, CIBA push, and approval along the way. You're looking at two different AI clients making requests on behalf of the same user, and a single audit trail covers both. That's compliance-ready by default."


## The Business Case

"Think about what RetailZero didn't have to build: OAuth server, consent management, dynamic client registration, token exchange, backchannel authentication, audit logging. Each of those is a quarter of engineering time on its own, and every one is a potential security gap."

"With Auth0, those become managed infrastructure. RetailZero went from a greenfield MCP server to a production-grade integration in weeks. Because the security layer is configured once, the incremental work to add Claude today, Gemini next month, and vertical agents next quarter is effectively zero. That is the shape of the operational cost curve, and it flattens out fast."

"The compounding effect matters even more. Faster go-to-market on each new AI channel means while a competitor is still designing their OAuth model for ChatGPT, you're transacting across three AI platforms. That's a structural advantage, not a feature gap."


## Handling Questions

**Why is the Live Playground a public route?**
It's our demo surface. Anonymous visitors see the shape of the integration without logging in. Auth is triggered on the first call that needs it (Initialize Session), which is the correct pattern for consent-forward design.

**What happens if I revoke Claude's access in Auth0?**
The next request gets a 401 because tokens are invalidated immediately, and session cleanup runs automatically.

**Can the model bypass the $100 threshold?**
No. The threshold check runs on the server before any CIBA is initiated, and finalization requires a valid CIBA token bound to the exact `auth_req_id` the server issued. The model has no path to produce that token without the user approving on the second channel. The policy lives below the model's reach.

**Can we set different thresholds per user segment?**
Yes. An Auth0 Action can embed a custom claim on the access token (e.g. `ciba_threshold: 500` for VIP buyers), and the MCP server reads the claim at request time. One flag handles per-segment enforcement without a redeploy.

**What's the token lifetime story?**
Access tokens expire on the Auth0-configured lifetime. The MCP server validates every request, so there's no long-lived state to poison. Refresh happens through the standard OAuth refresh flow, and CIBA tokens are single-use and bound to the `auth_req_id`. No token lives longer than it needs to.

**Does DCR work with all MCP clients?**
Any client that implements MCP's authorization spec works automatically. Claude Desktop and ChatGPT both do. A client that doesn't can still use a pre-registered Auth0 application with the same scopes, but DCR is the zero-friction path. That's how you scale without operational overhead.

**How long did this take to implement?**
Weeks, not quarters. Auth0 provides consent, DCR, CIBA, token exchange, and audit as managed services. Integration time is almost entirely the MCP server and the bounded authority policy definition. That's the operational leverage at work.
