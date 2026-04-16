# StyleVault MCP Security Demo: Presenter Script

Duration: ~8-10 minutes


## Setup

"This is StyleVault, a premium e-commerce platform. Like every commerce brand right now, they're asking: how do we let AI assistants securely shop on behalf of our customers?"

The answer is Auth0's Auth for MCP. Today I'm going to show you three scenarios: a 1st-party AI widget, ChatGPT via MCP Discovery, and Gemini through UCP. Each builds on the last.

Click Start Demo.


## Scenario A: StyleVault AI Widget (1st-Party)

"First, notice this purple widget in the corner. That's StyleVault's own 1st-party AI assistant. It's built right into their site. Let's interact with it."

Click the floating bubble.

"Alex gets a simple flow: they see a consent dialog, approve it, and the widget immediately has access to their wishlist. This is what 1st-party AI looks like when it's done right. No external auth server, no redirect flow. Just clear consent and immediate capability."

Click through the widget interaction to show wishlist access.

"The security is invisible. StyleVault embedded transaction controls directly in the token, so bounded authority is enforced at the infrastructure level. Code can't override it. Prompts can't override it."

Click to the CIBA approval moment.

"When the widget needs to execute a high-value action (like a purchase), Auth0 sends a CIBA push notification to Alex's device. The widget initiates. The human approves. That's the human-in-the-loop that customers trust and regulators require."

Click Approve.

"Watch what happens when Alex tries to buy the $2,400 watch. The cap is $250. The request is rejected. Infrastructure-level enforcement. No prompt injection, no hallucination, no code workaround."


## Scenario B: ChatGPT via MCP Discovery and Dynamic Registration

"Now let's move to the harder problem: 3rd-party AI clients like ChatGPT. These clients can't use the same simple flow because they're external, they're multi-session, and StyleVault didn't pre-register them."

"How does Auth0 solve this? Through MCP Discovery and Dynamic Client Registration."

Click the ChatGPT scenario.

"ChatGPT discovers StyleVault through published metadata. That metadata includes the MCP capabilities and a pointer to Auth0 as the authorization server. All of this is standardized and discoverable. ChatGPT then dynamically registers itself, and Auth0 issues credentials on the fly with no pre-configuration needed."

Click Approve on the passkey login.

"Alex logs in with a passkey through Auth0 Universal Login. This is modern authentication: faster than passwords, phishing-resistant, and no passwords to steal."

Click to the consent screen.

Here's the critical moment. Alex sees exactly what ChatGPT is requesting: five OAuth 2.1 scopes. Wishlist browse. Product search. Order placement. Preference updates. Order history. The user decides, not the AI. Auth0 enforces those boundaries on every request.

Click Approve.

ChatGPT is now exchanging that authorization code for tokens. Let's look under the hood.

Click "Under the Hood" and select the Technical tab.

"You're looking at the token exchange. ChatGPT sends an authorization code. Auth0 responds with an access token and an ID token. Look at the claims in the access token: the scopes we approved, the transaction limit, ChatGPT's client ID. All cryptographically signed. You can't forge it or tamper with it."

Click to show the Technical tab details (HTTP request, response, decoded claims).

"When ChatGPT calls the MCP server with this access token, Auth0 validates every request against the token's scopes, expiry, and bounded authority limits at the infrastructure layer."

Switch back to Business tab.

"From a business perspective: ChatGPT now has time-limited, scoped access to StyleVault's API. No permanent keys. No hardcoded credentials in configuration. Every request is validated and auditable."

Click through conversations 1 and 2.

"Alex browses the wishlist and searches for products. Every tool call is validated against the token's scopes and bounded authority claims, so the security is always active even though the user never sees it."


## Scenario B Continued: CIBA and Bounded Authority with ChatGPT

Click to conversation 3.

"Alex asks to buy the Heritage Duffle. ChatGPT has purchase scope. But Auth0 triggers a CIBA push notification to Alex's device. The AI initiates. The human authorizes. This is human-in-the-loop approval at scale."

Click Approve.

Now click to conversation 5 to see bounded authority in action.

"Alex asks ChatGPT to buy the $2,400 watch. ChatGPT has purchase scope. Valid syntax. But the token contains a $250 cap. The request is blocked before the MCP server sees it. Infrastructure enforcement, not code. Not bypassed by prompting."


## Scenario C: Gemini via UCP (Unified Commerce Protocol)

"Scenario three: Gemini via UCP. This is where things shift."

"UCP is designed for autonomous agents. Agents that operate on their own, making decisions without a human in the loop for every action. MCP assumes a human is actively controlling the AI. UCP assumes the agent has some autonomy. Google's backing UCP, so expect rapid adoption."

"Let's see how Auth0 handles autonomous agents securely."

Click the Gemini scenario.

"Different UI. Material Design. Google blue. Same backend, different agent profiles and capabilities."

Gemini starts by discovering StyleVault's UCP Merchant Manifest. This manifest defines the endpoints and the autonomous authority limits that StyleVault is comfortable with.

Click through the UCP Discovery flow.

"Next: Agent Profile Exchange and Capability Negotiation. Gemini identifies itself as a Google agent. StyleVault declares its authority limits. Auth0 validates both before tokens are issued."

"This is fundamentally different from MCP. With MCP, you're assuming the human approved this specific agent. With UCP, the agent may operate autonomously for hours, making multiple purchases. So the negotiation is stricter. The agent has to prove its identity and capabilities up front."

Click through passkey login.

Phishing-resistant authentication. Table stakes.

Click to the UCP Discovery Gate.

Auth0 validates Gemini's identity and capabilities against the merchant manifest. Is this agent legitimate? Does its authority level match StyleVault's policy? Only after validation passes does Gemini receive tokens.

Click Approve on consent.

"UCP scopes are coarser than MCP because the agent operates autonomously. Catalog read. Checkout session creation. Order read. Identity linking. Broader permissions, but still user-controlled. Alex decides what Gemini can do."

Click "Under the Hood" Technical tab.

"Token exchange. The OAuth flow is identical: authorization code for tokens. But notice the ucp_agent claim. This tells the backend that an autonomous agent is making requests, not a human. And look at the bounded_authority: an AP2 limit of $250. That's a policy limit. Gemini can make autonomous decisions up to $250. Anything higher requires human escalation."

"The AP2 limit is embedded in the token and enforced at the infrastructure layer. Same pattern as ChatGPT. Optimized for agents that operate on their own."

Switch back to Business tab.

"Operationally: UCP gives StyleVault autonomous agent capability with guardrails. The agent shops on the customer's behalf, completes purchases under the limit, and escalates only when it exceeds authority."

Click through UCP catalog search.

"Gemini searches the catalog. Auth0 validates the request against the token's UCP scopes. Autonomous agents move faster because they don't need human approval for every step."

Click to the UCP checkout session.

"Gemini initiates checkout for a $350 purchase. This exceeds the $250 AP2 limit. The backend returns requires_escalation. Not a hard wall. It's a policy embedded in the token. The backend enforces it without custom code."

Gemini receives the escalation state and initiates a CIBA request to Alex. Alex approves. The escalation is logged. The purchase completes.

Click Approve.

"This is UCP. Autonomous agent capability within defined limits. Human escalation for anything larger. Prompt injection can't override the limits. Network failures don't erase the audit trail."

Click to order tracking.

"Order tracking follows the same authorization patterns: scoped access, bounded authority enforcement, and a full audit trail."

Click to the final conversation.

"Gemini tries to buy a $2,400 item without escalation. AP2 limit is $250. Request is blocked before it reaches the application. Infrastructure enforcement. Gemini is out of authority."


## Under the Hood: Business vs. Technical Views

One important feature: the Under the Hood overlay. 

Make sure it's visible. Show the Business tab first.

"This explains security in business terms. What's happening. Why it matters. What's protected. No JWT syntax. No HTTP methods."

Click to the Technical tab.

"For engineers and architects: syntax-highlighted requests, decoded JWT claims, full HTTP flow. Tool call carousels showing the complete flow. MCP invoke, token exchange, API call, response."

"Everything transparent. Everything verifiable. You can see exactly what authority is being used, exactly what scopes are granted, exactly what the limits are. These overlays are built into the demo, so you can use a single view for both technical due diligence and business stakeholder communication."


## 1st-Party, 3rd-Party MCP, and UCP: One Security Layer

Here's what ties it all together. Three different AI clients. One security layer.

"StyleVault's own widget, ChatGPT via MCP, and Gemini via UCP are all connected through Auth0 with the same OAuth infrastructure, the same bounded authority enforcement, the same CIBA for step-up approval, and the same audit trail."

StyleVault configured the security once. It works for all three channels. When a fourth AI platform appears next quarter, the cost of adding it is near zero. Deploy the connector. Security posture remains unchanged.


## Why This Matters

The business case is stark.

Without Auth0: 3-6 months of custom engineering. OAuth servers. Consent management. Backchannel auth. Fine-grained permissions. Transaction limits. Audit logging. Each one a separate build. Each one a security risk.

With Auth0: managed services. StyleVault went from zero to a secured MCP server in weeks, not quarters. That's operational cost reduction and accelerated time to market.

The structural advantage runs deeper. Every new AI client that connects automatically gets the same security posture. ChatGPT today. Claude tomorrow. Vertical-specific agents next quarter. The marginal cost of each new channel approaches zero.

While competitors are still scoping their security architecture, StyleVault is live across multiple AI platforms. They compressed months of infrastructure work into days of integration. Their engineering team focuses on product, not security plumbing. That's competitive advantage in the era of agentic commerce.

Auth0 made it fast, made it affordable, made it trustworthy.


## Handling Questions

**Can the user revoke access?**
At any time. Tokens become invalid immediately. Existing sessions clean up automatically.

**What about autonomous agents? Doesn't revoking access break the transaction?**
UCP handles this through bounded authority and escalation policies. The agent operates under a cap, like the $250 AP2 limit. It completes purchases under the cap autonomously. Anything larger triggers escalation. You can revoke or adjust policy without breaking low-value operations.

**What if an AI model hallucinates a tool call?**
Every request is validated server-side against the token's scopes and bounded authority claims. Without a valid token, nothing executes, and the AI can't bypass infrastructure-layer enforcement even with fabricated requests.

**Does this work with other AI platforms?**
Any client that speaks MCP or UCP can connect. Same pattern. Same security posture. MCP for agents in a user session with active approval. UCP for autonomous agents within defined limits.

**How long did this take to implement?**
Weeks, not quarters. Auth0 provides consent, CIBA, and token infrastructure as managed services. The time goes into integrating the MCP connector and defining authority policies. The auth layer is ready to deploy.

**What happens if an agent exceeds its authority?**
In MCP: request fails at the infrastructure level. In UCP: agent receives an escalation response and must request human approval. Both are cryptographically enforced through token claims. Application code can't override them.

**Do I have to use all three approaches?**
No. StyleVault chose all three for different user experiences and autonomy levels. You might use only MCP (ChatGPT with real-time approval). Or only UCP (autonomous procurement agents). Auth0 supports all patterns.

**What about the audit trail?**
Complete. Every token exchange, API call, CIBA approval, and authority decision is logged. You can reconstruct the entire authorization flow for any transaction. Compliance-ready out of the box.
