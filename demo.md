# StyleVault MCP Security Demo: Presenter Script

Duration: ~5 minutes


## Setup

"This is StyleVault, a premium e-commerce platform. Like every commerce brand right now, they're asking: how do we let AI assistants securely shop on behalf of our customers?"

"The answer is Auth0's Auth for MCP. Let me show you what that looks like in practice."

Click Start Demo.


## Connection and Consent

"Alex is in ChatGPT and wants to access their StyleVault account. Auth0 handles the entire connection flow. Alex authenticates with a passkey, then sees a consent screen where they control exactly what ChatGPT can do: view their wishlist, search products, place orders, update preferences."

"The user decides. Not the AI. Not the developer. Auth0 enforces those boundaries with scoped OAuth 2.1 tokens."

Click Approve.


## Browsing and Shopping

Click through conversations 1 and 2.

"Alex browses their wishlist, searches for products, checks order history. Every tool call hits Auth0's Fine-Grained Authorization, which validates that this specific agent has the right relationship to this specific resource. The security is always on, but invisible to the user."


## Purchase with Step-Up Approval

Click to conversation 3. Alex asks to buy the Heritage Duffle.

"Now Alex wants to buy something. Even though ChatGPT has purchase permission, Auth0 triggers a CIBA push notification to Alex's device for real-time approval. The AI initiates. The human authorizes. That's the human-in-the-loop that compliance teams and customers both want."

Click Approve.


## Bounded Authority

Click to conversation 5. Alex asks to buy the $2,400 watch.

"Here's the key moment. Alex asks ChatGPT to buy a $2,400 watch. ChatGPT has the right scope. But Auth0 embedded a $250 transaction cap directly in the token. The request is blocked at the infrastructure level, not in application code. No rogue prompt or confused model can bypass it."


## 1st-Party and 3rd-Party, One Security Layer

Point to the StyleVault AI widget.

"Notice this widget in the corner. That's StyleVault's own 1st-party AI assistant. It connects through the same MCP server with the same Auth0 security. Same consent, same CIBA, same bounded authority. StyleVault built one security layer and it works for every AI client that connects."


## Why This Matters

"Here's the business case."

"Without Auth0, you're looking at 3-6 months of custom engineering just for the security layer. OAuth servers, consent management, backchannel auth, fine-grained permissions, transaction limits, audit logging. Each one a separate build."

"With Auth0, StyleVault configured these capabilities as managed services. They went from zero to a secured MCP server in production in weeks, not quarters. That's a dramatic reduction in operational cost and a fundamentally faster path to market."

"And because the MCP server is secured once, every new AI client that connects (ChatGPT today, Claude or Gemini tomorrow, vertical-specific agents next quarter) gets the same security posture automatically. The marginal cost of adding a new AI channel is near zero."

"That's the structural advantage. While competitors are still scoping their security architecture, StyleVault is already live across multiple AI platforms. They compressed months of infrastructure work into days of integration, kept their engineering team focused on the product instead of security plumbing, and reinforced their position as a serious player in the new era of agentic commerce."

"Auth0 made it fast, made it affordable, and made it trustworthy. That's Auth for MCP."


## Handling Questions

"Can the user revoke access?"
Yes. Consent can be revoked at any time through Auth0, immediately invalidating the agent's tokens.

"What if an AI model hallucinates a tool call?"
Every tool call is validated server-side. Without a valid scoped token that passes FGA checks and bounded authority claims, nothing executes.

"Does this work with other AI platforms?"
Any AI client that speaks MCP can connect. Auth0 secures the server side, so adding new clients is the same pattern with the same security posture.

"How long did this take to implement?"
Weeks, not quarters. Auth0 provides consent, CIBA, FGA, and token infrastructure as managed services.
