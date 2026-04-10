import type { DemoStep, ScenarioConfig } from "./types";

export function getConversationSteps(steps: DemoStep[], conversationId: string): DemoStep[] {
  return steps.filter(s => s.conversation === conversationId);
}

export function computeEffectiveSteps(
  baseSteps: DemoStep[],
  gateDecisions: Record<string, "approved" | "denied">,
  cibaDenials: Record<string, DemoStep>,
  consentDeniedSteps: DemoStep[],
): DemoStep[] {
  const result: DemoStep[] = [];
  for (let i = 0; i < baseSteps.length; i++) {
    const step = baseSteps[i];
    const prevStep = i > 0 ? baseSteps[i - 1] : null;

    // Consent denied: strip gate event, add denial steps (which have proper denied event), stop
    if (prevStep?.gate === "consent" && prevStep.gateId && gateDecisions[prevStep.gateId] === "denied") {
      if (result.length > 0 && result[result.length - 1].securityEvent) {
        const stripped = { ...result[result.length - 1] };
        delete stripped.securityEvent;
        result[result.length - 1] = stripped;
      }
      result.push(...consentDeniedSteps);
      break;
    }

    // UCP discovery denied: same as consent denial
    if (prevStep?.gate === "ucp-discovery" && prevStep.gateId && gateDecisions[prevStep.gateId] === "denied") {
      if (result.length > 0 && result[result.length - 1].securityEvent) {
        const stripped = { ...result[result.length - 1] };
        delete stripped.securityEvent;
        result[result.length - 1] = stripped;
      }
      result.push(...consentDeniedSteps);
      break;
    }

    // CIBA denied: strip gate event, insert denial step (which has proper denied event)
    if (prevStep?.gate === "ciba" && prevStep.gateId && gateDecisions[prevStep.gateId] === "denied") {
      if (result.length > 0 && result[result.length - 1].securityEvent) {
        const stripped = { ...result[result.length - 1] };
        delete stripped.securityEvent;
        result[result.length - 1] = stripped;
      }
      const denial = cibaDenials[prevStep.gateId];
      if (denial) { result.push(denial); continue; }
    }

    result.push(step);
  }
  return result;
}

// =============================================
// SCENARIO A - StyleVault AI (1st-party, broad)
// =============================================

// StyleVault AI steps - used by the floating widget
export const STYLEVAULT_AI_STEPS: DemoStep[] = [
  {
    id: "a-1-connect",
    type: "chat",
    chat: {
      id: "a-1", role: "system",
      content: "StyleVault AI is now connected to StyleVault via MCP.",
      timestamp: "10:00:01",
    },
  },
  {
    id: "a-2-consent",
    type: "security-moment",
    gate: "consent",
    gateId: "consent-a",
    securityMoment: {
      kind: "consent",
      clientName: "StyleVault AI",
      productName: "StyleVault",
      scopes: [
        { scope: "read:wishlist", label: "View your wishlist", icon: "heart" },
        { scope: "read:orders", label: "View your order history", icon: "package" },
        { scope: "read:products", label: "Search products", icon: "search" },
        { scope: "write:preferences", label: "Update your style preferences", icon: "sliders" },
        { scope: "execute:purchase", label: "Place orders on your behalf", icon: "shopping-cart" },
      ],
      onApprove: "consent-a-approved",
      onDeny: "consent-a-denied",
    },
    securityEvent: {
      id: "evt-a-consent", timestamp: "10:00:02", type: "consent", result: "granted",
      scenarioId: "scenario-a",
      businessDescription: "Alex Morgan approved StyleVault AI's request to access their StyleVault account with full shopping permissions.",
      technicalDetail: {
        protocol: "OAuth 2.1: Authorization Code + PKCE",
        request: "POST /authorize HTTP/1.1\nHost: stylevault.us.auth0.com\nresponse_type=code\n&scope=read:wishlist read:orders read:products write:preferences execute:purchase\n&client_id=cli_sv_ai_001\n&code_challenge=E9Melhoa2OwvFrEMTJg...\n&code_challenge_method=S256",
        response: "HTTP/1.1 302 Found\nLocation: /callback?code=SplxlOBeZQQYbYS6WxSbIA",
      },
    },
  },
  {
    id: "a-3-connected",
    type: "chat",
    chat: {
      id: "a-3", role: "system",
      content: "Connected! StyleVault AI can now access your StyleVault data.",
      timestamp: "10:00:05",
    },
  },
  {
    id: "a-4-read",
    type: "chat",
    chat: {
      id: "a-4", role: "user",
      content: "Show me what's on my wishlist",
      timestamp: "10:00:10",
    },
  },
  {
    id: "a-5-response",
    type: "chat",
    chat: {
      id: "a-5", role: "assistant",
      content: "Here's your wishlist! You have 4 saved items:\n\n1. Cashmere Wrap Scarf - $189.00\n2. Blue Denim Jacket (Limited Edition) - $79.99\n3. Leather Weekender Bag - $425.00\n4. Meridian Automatic Watch - $2,400.00\n\nWould you like me to check availability or help with a purchase?",
      timestamp: "10:00:12",
      toolCall: { name: "get_wishlist", status: "success", steps: [
        { label: "MCP Server", description: "get_wishlist called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:wishlist\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:wishlist\"\n}",
        },
        { label: "StyleVault API", description: "GET /api/v1/users/alex_morgan/wishlist", status: "success",
          request: "GET /api/v1/users/alex_morgan/wishlist HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"items\": [\n    {\"name\": \"Cashmere Wrap Scarf\", \"price\": 189.00},\n    {\"name\": \"Blue Denim Jacket\", \"price\": 79.99},\n    ...\n  ]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-a-read", timestamp: "10:00:12", type: "tool-call", result: "granted",
      scenarioId: "scenario-a",
      businessDescription: "Auth0 verified StyleVault AI has permission to view Alex Morgan's wishlist.",
      technicalDetail: {
        protocol: "Tool Call Flow",
        toolName: "get_wishlist",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:wishlist\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:wishlist\"\n}",
        },
        downstreamApi: {
          request: "GET /api/v1/users/alex_morgan/wishlist HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"items\": [\n    {\"name\": \"Cashmere Wrap Scarf\", \"price\": 189.00},\n    {\"name\": \"Blue Denim Jacket\", \"price\": 79.99},\n    {\"name\": \"Leather Weekender Bag\", \"price\": 425.00},\n    {\"name\": \"Meridian Automatic Watch\", \"price\": 2400.00}\n  ]\n}",
        },
      },
    },
  },
  {
    id: "a-6-sensitive",
    type: "chat",
    chat: {
      id: "a-6", role: "user",
      content: "Buy the Blue Denim Jacket for me",
      timestamp: "10:00:20",
    },
  },
  {
    id: "a-7-ciba",
    type: "security-moment",
    gate: "ciba",
    gateId: "ciba-a",
    securityMoment: {
      kind: "ciba",
      action: "Approve purchase: Blue Denim Jacket ($79.99)",
      description: "StyleVault AI wants to place an order on your behalf.",
      approverName: "Alex Morgan",
    },
    securityEvent: {
      id: "evt-a-ciba", timestamp: "10:00:22", type: "ciba", result: "approved",
      scenarioId: "scenario-a",
      businessDescription: "Alex Morgan approved the $79.99 jacket purchase via push notification.",
      technicalDetail: {
        protocol: "CIBA: Client-Initiated Backchannel Authentication",
        request: "POST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"Purchase: Blue Denim Jacket ($79.99)\",\n  \"scope\": \"execute:purchase\"\n}",
        response: "HTTP/1.1 200 OK\n{\n  \"auth_req_id\": \"ciba-req-001\",\n  \"expires_in\": 300,\n  \"interval\": 5\n}",
      },
    },
  },
  {
    id: "a-8-success",
    type: "chat",
    chat: {
      id: "a-8", role: "assistant",
      content: "Done! I've placed the order for the Blue Denim Jacket ($79.99). You'll receive a confirmation email at alex@example.com shortly. Expected delivery is 3-5 business days.",
      timestamp: "10:00:30",
      toolCall: { name: "place_order", status: "success", steps: [
        { label: "MCP Server", description: "place_order called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\"\n}",
        },
        { label: "StyleVault API", description: "POST /api/v1/orders", status: "success",
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"jacket_denim_001\", \"amount\": 79.99}",
          response: "HTTP/1.1 201 Created\n{\n  \"order_id\": \"ord_8f3k2\",\n  \"status\": \"confirmed\"\n}",
        },
      ] },
    },
  },
  {
    id: "a-9-bounded",
    type: "chat",
    chat: {
      id: "a-9", role: "user",
      content: "Great! Now buy the Meridian Automatic Watch too",
      timestamp: "10:00:40",
    },
  },
  {
    id: "a-10-denial",
    type: "chat",
    chat: {
      id: "a-10", role: "assistant",
      content: "I'd love to help, but the Meridian Automatic Watch is $2,400.00, which exceeds my $250 purchase authorization limit. For premium items like this, you can complete the purchase directly on StyleVault where additional verification protects high-value transactions.",
      timestamp: "10:00:42",
      toolCall: { name: "place_order", status: "denied", detail: "bounded_authority_exceeded: $250", steps: [
        { label: "MCP Server", description: "place_order called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        { label: "StyleVault API", description: "Rejected: $2,400 exceeds $250 token cap", status: "denied",
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"watch_meridian_001\", \"amount\": 2400.00}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds max $250.00\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-a-bounded", timestamp: "10:00:42", type: "bounded-authority", result: "denied",
      scenarioId: "scenario-a",
      businessDescription: "StyleVault AI attempted to purchase a $2,400 watch exceeding the $250 per-transaction cap. Auth0 blocked the request.",
      technicalDetail: {
        protocol: "OAuth 2.1: Bounded Authority Claim",
        request: "POST /mcp/tools/place_order HTTP/1.1\nAuthorization: Bearer eyJhbG...\n\n{\"item_id\": \"watch_meridian_001\", \"amount\": 2400.00}",
        response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"Value $2,400.00 exceeds max $250.00 per transaction\"\n}",
        tokenClaims: { max_purchase_amount: "$250.00", scope: "execute:purchase" },
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        downstreamApi: {
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"watch_meridian_001\", \"amount\": 2400.00}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds max $250.00\"\n}",
        },
      },
    },
  },
];

// =============================================
// SCENARIO B - ChatGPT (3rd-party, full access)
// =============================================

// Conversation IDs for ChatGPT scenario - each is a separate chat thread
const CONV_B1 = "Browse my wishlist";
const CONV_B2 = "Find me a leather bag";
const CONV_B3 = "Buy the Heritage Duffle";
const CONV_B4 = "Update my style preferences";
const CONV_B5 = "Buy the Meridian Watch";

// Exported for ClientBShell sidebar
export const CHATGPT_CONVERSATIONS = [
  { id: CONV_B1, label: CONV_B1 },
  { id: CONV_B2, label: CONV_B2 },
  { id: CONV_B3, label: CONV_B3 },
  { id: CONV_B4, label: CONV_B4 },
  { id: CONV_B5, label: CONV_B5 },
];

const SCENARIO_B_STEPS: DemoStep[] = [
  // === CHAT 1: "Browse my wishlist" - login + consent + successful wishlist read ===
  {
    id: "b-1", type: "chat", conversation: CONV_B1,
    chat: { id: "b-1", role: "system", content: "ChatGPT discovered StyleVault MCP server.", timestamp: "10:05:01" },
  },
  {
    id: "b-1.5-login", type: "security-moment", gate: "login", gateId: "login-b", conversation: CONV_B1,
    securityMoment: { kind: "login", method: "passkey" },
    securityEvent: {
      id: "evt-b-login", timestamp: "10:05:01", type: "token-issued", result: "granted", scenarioId: "scenario-b",
      businessDescription: "Alex Morgan authenticated via passkey through Auth0 Universal Login.",
      technicalDetail: {
        protocol: "WebAuthn / Passkeys via Auth0 Universal Login",
        request: "GET /authorize HTTP/1.1\nHost: stylevault.us.auth0.com\nresponse_type=code\n&client_id=cli_chatgpt_002\n&prompt=login",
        response: "HTTP/1.1 302 Found\nLocation: /callback?code=Qcb0Orv1zh30vL\n\n// User authenticated via platform passkey (Face ID / Touch ID)",
      },
    },
  },
  {
    id: "b-2-consent", type: "security-moment", gate: "consent", gateId: "consent-b", conversation: CONV_B1,
    securityMoment: {
      kind: "consent", clientName: "ChatGPT", productName: "StyleVault",
      scopes: [
        { scope: "read:wishlist", label: "View your wishlist", icon: "heart" },
        { scope: "read:orders", label: "View your order history", icon: "package" },
        { scope: "read:products", label: "Search products", icon: "search" },
        { scope: "write:preferences", label: "Update your style preferences", icon: "sliders" },
        { scope: "execute:purchase", label: "Place orders on your behalf", icon: "shopping-cart" },
      ],
      onApprove: "consent-b-approved", onDeny: "consent-b-denied",
    },
    securityEvent: {
      id: "evt-b-consent", timestamp: "10:05:02", type: "consent", result: "granted", scenarioId: "scenario-b",
      businessDescription: "Alex Morgan approved ChatGPT with full access to their StyleVault account, including purchases and preferences.",
      technicalDetail: {
        protocol: "OAuth 2.1: Authorization Code + PKCE",
        request: "POST /authorize HTTP/1.1\nHost: stylevault.us.auth0.com\nresponse_type=code\n&scope=read:wishlist read:orders read:products write:preferences execute:purchase\n&client_id=cli_chatgpt_002",
        response: "HTTP/1.1 302 Found\nLocation: /callback?code=Qcb0Orv1zh30vL",
      },
    },
  },
  {
    id: "b-3", type: "chat", conversation: CONV_B1,
    chat: { id: "b-3", role: "system", content: "Connected! ChatGPT can now access your StyleVault data.", timestamp: "10:05:05" },
  },
  {
    id: "b-4", type: "chat", conversation: CONV_B1,
    chat: { id: "b-4", role: "user", content: "What's on my StyleVault wishlist?", timestamp: "10:05:08" },
  },
  {
    id: "b-5", type: "chat", conversation: CONV_B1,
    chat: {
      id: "b-5", role: "assistant",
      content: "Here's your StyleVault wishlist:\n\n1. Cashmere Wrap Scarf - $189.00\n2. Blue Denim Jacket (Limited Edition) - $79.99\n3. Leather Weekender Bag - $425.00\n4. Meridian Automatic Watch - $2,400.00\n\nNice collection! The Denim Jacket is a limited edition. Want me to check if it's still in stock?",
      timestamp: "10:05:10",
      toolCall: { name: "get_wishlist", status: "success", steps: [
        { label: "MCP Server", description: "get_wishlist called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:wishlist\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:wishlist\"\n}",
        },
        { label: "StyleVault API", description: "GET /api/v1/users/alex_morgan/wishlist", status: "success",
          request: "GET /api/v1/users/alex_morgan/wishlist HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"items\": [\n    {\"name\": \"Cashmere Wrap Scarf\", \"price\": 189.00},\n    ...\n  ]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-b-wishlist", timestamp: "10:05:10", type: "tool-call", result: "granted", scenarioId: "scenario-b",
      businessDescription: "Read access granted. ChatGPT viewed Alex Morgan's wishlist.",
      technicalDetail: {
        protocol: "Tool Call Flow",
        toolName: "get_wishlist",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:wishlist\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:wishlist\"\n}",
        },
        downstreamApi: {
          request: "GET /api/v1/users/alex_morgan/wishlist HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"items\": [\n    {\"name\": \"Cashmere Wrap Scarf\", \"price\": 189.00},\n    {\"name\": \"Blue Denim Jacket\", \"price\": 79.99},\n    {\"name\": \"Leather Weekender Bag\", \"price\": 425.00},\n    {\"name\": \"Meridian Automatic Watch\", \"price\": 2400.00}\n  ]\n}",
        },
      },
    },
  },

  // === CHAT 2: "Find me a leather bag" - product search + order history check ===
  {
    id: "b-6", type: "chat", conversation: CONV_B2,
    chat: { id: "b-6", role: "user", content: "I saw a Leather Weekender on my wishlist for $425. Can you find something similar but under $300?", timestamp: "10:06:01" },
  },
  {
    id: "b-7", type: "chat", conversation: CONV_B2,
    chat: {
      id: "b-7", role: "assistant",
      content: "I found 3 leather bags under $300 on StyleVault:\n\n1. Heritage Duffle - $269.00 (4.7 stars, 93 reviews)\n2. City Tote - $199.00 (4.5 stars, 156 reviews)\n3. Compact Travel Satchel - $149.00 (4.8 stars, 72 reviews)\n\nThe Heritage Duffle is the closest match in style and capacity. Want me to compare them in detail?",
      timestamp: "10:06:04",
      toolCall: { name: "search_products", status: "success", steps: [
        { label: "MCP Server", description: "search_products called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:products\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:products\"\n}",
        },
        { label: "StyleVault API", description: "GET /api/v1/products/search?q=leather+bag&max_price=300", status: "success",
          request: "GET /api/v1/products/search?q=leather+bag&max_price=300 HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"results\": [\n    {\"name\": \"Heritage Duffle\", \"price\": 269.00},\n    ...\n  ]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-b-search", timestamp: "10:06:04", type: "tool-call", result: "granted", scenarioId: "scenario-b",
      businessDescription: "ChatGPT searched the StyleVault product catalog on Alex's behalf.",
      technicalDetail: {
        protocol: "Tool Call Flow",
        toolName: "search_products",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:products\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:products\"\n}",
        },
        downstreamApi: {
          request: "GET /api/v1/products/search?q=leather+bag&max_price=300 HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"results\": [\n    {\"name\": \"Heritage Duffle\", \"price\": 269.00},\n    {\"name\": \"City Tote\", \"price\": 199.00},\n    {\"name\": \"Compact Travel Satchel\", \"price\": 149.00}\n  ]\n}",
        },
      },
    },
  },
  {
    id: "b-8", type: "chat", conversation: CONV_B2,
    chat: { id: "b-8", role: "user", content: "Good options. Let me check my recent orders first,I don't want to buy a bag I already have coming.", timestamp: "10:06:10" },
  },
  {
    id: "b-9", type: "chat", conversation: CONV_B2,
    chat: {
      id: "b-9", role: "assistant",
      content: "Here are your recent StyleVault orders:\n\n1. Silk Blend Blazer - $299.00 (Delivered Mar 15)\n2. Canvas Sneakers - $89.00 (Delivered Mar 8)\n3. Linen Shirt Set - $145.00 (Delivered Feb 28)\n\nNo bags in your recent orders, you're clear! The Heritage Duffle would pair well with that Blazer, by the way.",
      timestamp: "10:06:13",
      toolCall: { name: "get_order_history", status: "success", steps: [
        { label: "MCP Server", description: "get_order_history called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:orders\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:orders\"\n}",
        },
        { label: "StyleVault API", description: "GET /api/v1/users/alex_morgan/orders", status: "success",
          request: "GET /api/v1/users/alex_morgan/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"orders\": [\n    {\"item\": \"Silk Blend Blazer\", \"amount\": 299.00},\n    ...\n  ]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-b-orders", timestamp: "10:06:13", type: "tool-call", result: "granted", scenarioId: "scenario-b",
      businessDescription: "Read access granted. ChatGPT viewed Alex Morgan's order history.",
      technicalDetail: {
        protocol: "Tool Call Flow",
        toolName: "get_order_history",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=read:orders\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"read:orders\"\n}",
        },
        downstreamApi: {
          request: "GET /api/v1/users/alex_morgan/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"orders\": [\n    {\"item\": \"Silk Blend Blazer\", \"amount\": 299.00},\n    {\"item\": \"Canvas Sneakers\", \"amount\": 89.00},\n    {\"item\": \"Linen Shirt Set\", \"amount\": 145.00}\n  ]\n}",
        },
      },
    },
  },

  // === CHAT 3: "Buy the Heritage Duffle" - purchase succeeds via CIBA ===
  {
    id: "b-10", type: "chat", conversation: CONV_B3,
    chat: { id: "b-10", role: "user", content: "I've decided. Buy me the Heritage Duffle from StyleVault.", timestamp: "10:07:01" },
  },
  {
    id: "b-11-ciba", type: "security-moment", gate: "ciba", gateId: "ciba-b", conversation: CONV_B3,
    securityMoment: {
      kind: "ciba",
      action: "Approve purchase: Heritage Duffle ($269.00)",
      description: "ChatGPT wants to place an order on your behalf via StyleVault.",
      approverName: "Alex Morgan",
    },
    securityEvent: {
      id: "evt-b-ciba", timestamp: "10:07:02", type: "ciba", result: "approved", scenarioId: "scenario-b",
      businessDescription: "Alex Morgan approved the $269.00 Heritage Duffle purchase via push notification.",
      technicalDetail: {
        protocol: "CIBA: Client-Initiated Backchannel Authentication",
        request: "POST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"Purchase: Heritage Duffle ($269.00)\",\n  \"scope\": \"execute:purchase\"\n}",
        response: "HTTP/1.1 200 OK\n{\n  \"auth_req_id\": \"ciba-req-b01\",\n  \"expires_in\": 300,\n  \"interval\": 5\n}",
      },
    },
  },
  {
    id: "b-12", type: "chat", conversation: CONV_B3,
    chat: {
      id: "b-12", role: "assistant",
      content: "Done! I've placed the order for the Heritage Duffle ($269.00). You'll receive a confirmation email at alex@example.com shortly. Expected delivery is 3-5 business days.\n\nGreat choice. It'll pair perfectly with that Silk Blend Blazer you ordered last month!",
      timestamp: "10:07:08",
      toolCall: { name: "place_order", status: "success", steps: [
        { label: "MCP Server", description: "place_order called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\"\n}",
        },
        { label: "StyleVault API", description: "POST /api/v1/orders", status: "success",
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"bag_heritage_001\", \"amount\": 269.00}",
          response: "HTTP/1.1 201 Created\n{\n  \"order_id\": \"ord_9x7m1\",\n  \"status\": \"confirmed\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-b-purchase", timestamp: "10:07:08", type: "tool-call", result: "granted", scenarioId: "scenario-b",
      businessDescription: "ChatGPT successfully placed the Heritage Duffle order after CIBA approval.",
      technicalDetail: {
        protocol: "Tool Call Flow",
        toolName: "place_order",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\"\n}",
        },
        downstreamApi: {
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"bag_heritage_001\", \"amount\": 269.00}",
          response: "HTTP/1.1 201 Created\n{\n  \"order_id\": \"ord_9x7m1\",\n  \"status\": \"confirmed\"\n}",
        },
      },
    },
  },

  // === CHAT 4: "Update my style preferences" - write succeeds ===
  {
    id: "b-13", type: "chat", conversation: CONV_B4,
    chat: { id: "b-13", role: "user", content: "Can you save 'leather bags' and 'weekend travel' as style preferences on my StyleVault profile?", timestamp: "10:08:01" },
  },
  {
    id: "b-14", type: "chat", conversation: CONV_B4,
    chat: {
      id: "b-14", role: "assistant",
      content: "Done! I've updated your StyleVault style preferences:\n\n+ leather bags\n+ weekend travel\n\nThese have been added alongside your existing preferences. StyleVault will now surface more leather goods and travel-ready pieces in your recommendations.",
      timestamp: "10:08:04",
      toolCall: { name: "update_preferences", status: "success", steps: [
        { label: "MCP Server", description: "update_preferences called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=write:preferences\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"write:preferences\"\n}",
        },
        { label: "StyleVault API", description: "PUT /api/v1/users/alex_morgan/preferences", status: "success",
          request: "PUT /api/v1/users/alex_morgan/preferences HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"add\": [\"leather bags\", \"weekend travel\"]}",
          response: "HTTP/1.1 200 OK\n{\n  \"preferences\": [\"leather bags\", \"weekend travel\", ...]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-b-prefs", timestamp: "10:08:04", type: "tool-call", result: "granted", scenarioId: "scenario-b",
      businessDescription: "ChatGPT updated Alex Morgan's style preferences with write:preferences scope.",
      technicalDetail: {
        protocol: "Tool Call Flow",
        toolName: "update_preferences",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=write:preferences\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"write:preferences\"\n}",
        },
        downstreamApi: {
          request: "PUT /api/v1/users/alex_morgan/preferences HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"add\": [\"leather bags\", \"weekend travel\"]}",
          response: "HTTP/1.1 200 OK\n{\n  \"preferences\": [\n    \"leather bags\",\n    \"weekend travel\"\n  ]\n}",
        },
      },
    },
  },

  // === CHAT 5: "Buy the Meridian Watch" - bounded authority denial ===
  {
    id: "b-15", type: "chat", conversation: CONV_B5,
    chat: { id: "b-15", role: "user", content: "Now buy me the Meridian Automatic Watch from my wishlist.", timestamp: "10:09:01" },
  },
  {
    id: "b-16", type: "chat", conversation: CONV_B5,
    chat: {
      id: "b-16", role: "assistant",
      content: "I'd love to help, but the Meridian Automatic Watch is $2,400.00, which exceeds my $250 purchase authorization limit. For premium items like this, you can complete the purchase directly on StyleVault where additional verification protects high-value transactions.",
      timestamp: "10:09:03",
      toolCall: { name: "place_order", status: "denied", detail: "bounded_authority_exceeded: $250", steps: [
        { label: "MCP Server", description: "place_order called", status: "success" },
        { label: "Auth0 Token Exchange", description: "Custom token exchange via /oauth/token", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        { label: "StyleVault API", description: "Rejected: $2,400 exceeds $250 token cap", status: "denied",
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"watch_meridian_001\", \"amount\": 2400.00}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds max $250.00\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-b-bounded", timestamp: "10:09:03", type: "bounded-authority", result: "denied", scenarioId: "scenario-b",
      businessDescription: "ChatGPT attempted to purchase a $2,400 watch exceeding the $250 per-transaction cap. Auth0 blocked the request.",
      technicalDetail: {
        protocol: "OAuth 2.1: Bounded Authority Claim",
        request: "POST /mcp/tools/place_order HTTP/1.1\nAuthorization: Bearer eyJhbG...\n\n{\"item_id\": \"watch_meridian_001\", \"amount\": 2400.00}",
        response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"Value $2,400.00 exceeds max $250.00 per transaction\"\n}",
        tokenClaims: { max_purchase_amount: "$250.00", scope: "execute:purchase" },
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=execute:purchase\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"execute:purchase\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        downstreamApi: {
          request: "POST /api/v1/orders HTTP/1.1\nHost: api.stylevault.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n\n{\"item_id\": \"watch_meridian_001\", \"amount\": 2400.00}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds max $250.00\"\n}",
        },
      },
    },
  },
];

// =============================================
// SCENARIO C - Gemini (3rd-party, UCP)
// =============================================

const CONV_C1 = "Discover StyleVault store";
const CONV_C2 = "Find me a leather bag";
const CONV_C3 = "Buy the Heritage Duffle";
const CONV_C4 = "Track my order";
const CONV_C5 = "Buy the Meridian Watch";

export const GEMINI_CONVERSATIONS = [
  { id: CONV_C1, label: CONV_C1 },
  { id: CONV_C2, label: CONV_C2 },
  { id: CONV_C3, label: CONV_C3 },
  { id: CONV_C4, label: CONV_C4 },
  { id: CONV_C5, label: CONV_C5 },
];

const SCENARIO_C_STEPS: DemoStep[] = [
  // === CHAT 1: "Discover StyleVault store" - login + UCP discovery + consent ===
  {
    id: "c-1", type: "chat", conversation: CONV_C1,
    chat: { id: "c-1", role: "system", content: "Gemini discovered StyleVault UCP merchant endpoint.", timestamp: "11:00:01" },
  },
  {
    id: "c-1.5-login", type: "security-moment", gate: "login", gateId: "login-c", conversation: CONV_C1,
    securityMoment: { kind: "login", method: "passkey" },
    securityEvent: {
      id: "evt-c-login", timestamp: "11:00:01", type: "token-issued", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan authenticated via passkey through Auth0 Universal Login.",
      technicalDetail: {
        protocol: "WebAuthn / Passkeys via Auth0 Universal Login",
        request: "GET /authorize HTTP/1.1\nHost: stylevault.us.auth0.com\nresponse_type=code\n&client_id=cli_gemini_003\n&prompt=login",
        response: "HTTP/1.1 302 Found\nLocation: /callback?code=Xk9pLm3vRt7wYz\n\n// User authenticated via platform passkey (Face ID / Touch ID)",
      },
    },
  },
  {
    id: "c-2-discovery", type: "security-moment", gate: "ucp-discovery", gateId: "ucp-discovery-c", conversation: CONV_C1,
    securityMoment: {
      kind: "ucp-discovery",
      merchantName: "StyleVault",
      capabilities: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.catalog", "dev.ucp.shopping.orders", "dev.ucp.shopping.identity"],
      manifestUrl: "https://stylevault.com/.well-known/ucp",
    },
    securityEvent: {
      id: "evt-c-discovery", timestamp: "11:00:03", type: "ucp-discovery", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini discovered StyleVault's UCP capabilities. Auth0 validated the agent's identity before exposing merchant endpoints.",
      technicalDetail: {
        protocol: "UCP: Capability Discovery via /.well-known/ucp",
        request: "GET /.well-known/ucp HTTP/1.1\nHost: stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
        response: "HTTP/1.1 200 OK\n{\n  \"name\": \"StyleVault\",\n  \"ucp_version\": \"2026-04-08\",\n  \"capabilities\": [\n    \"dev.ucp.shopping.checkout\",\n    \"dev.ucp.shopping.catalog\",\n    \"dev.ucp.shopping.orders\",\n    \"dev.ucp.shopping.identity\"\n  ],\n  \"endpoints\": {\n    \"checkout\": \"/ucp/v1/checkout\",\n    \"catalog\": \"/ucp/v1/catalog\",\n    \"orders\": \"/ucp/v1/orders\"\n  },\n  \"payment_handlers\": [\"stripe\", \"google_pay\"],\n  \"auth\": {\n    \"type\": \"oauth2\",\n    \"issuer\": \"https://stylevault.us.auth0.com\"\n  }\n}",
      },
    },
  },
  {
    id: "c-3-consent", type: "security-moment", gate: "consent", gateId: "consent-c", conversation: CONV_C1,
    securityMoment: {
      kind: "consent", clientName: "Gemini", productName: "StyleVault",
      scopes: [
        { scope: "ucp:catalog:read", label: "Browse product catalog", icon: "search" },
        { scope: "ucp:checkout:session", label: "Create checkout sessions", icon: "shopping-cart" },
        { scope: "ucp:orders:read", label: "View order status", icon: "package" },
        { scope: "ucp:identity:link", label: "Link your account", icon: "user" },
      ],
      onApprove: "consent-c-approved", onDeny: "consent-c-denied",
    },
    securityEvent: {
      id: "evt-c-consent", timestamp: "11:00:05", type: "consent", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan authorized Gemini to access StyleVault via UCP with catalog, checkout, orders, and identity linking permissions.",
      technicalDetail: {
        protocol: "OAuth 2.1: Authorization Code + PKCE (UCP Identity Linking)",
        request: "POST /authorize HTTP/1.1\nHost: stylevault.us.auth0.com\nresponse_type=code\n&scope=ucp:catalog:read ucp:checkout:session ucp:orders:read ucp:identity:link\n&client_id=cli_gemini_003",
        response: "HTTP/1.1 302 Found\nLocation: /callback?code=Xk9pLm3vRt7wYz",
      },
    },
  },
  {
    id: "c-4", type: "chat", conversation: CONV_C1,
    chat: { id: "c-4", role: "system", content: "Connected! Gemini can now shop StyleVault on your behalf via Universal Commerce Protocol.", timestamp: "11:00:08" },
  },
  {
    id: "c-5", type: "chat", conversation: CONV_C1,
    chat: { id: "c-5", role: "user", content: "What can you do on StyleVault for me?", timestamp: "11:00:12" },
  },
  {
    id: "c-6", type: "chat", conversation: CONV_C1,
    chat: {
      id: "c-6", role: "assistant",
      content: "I've connected to StyleVault through the Universal Commerce Protocol. Here's what I can help with:\n\n- Browse their product catalog and search for items\n- Start a checkout and purchase items on your behalf\n- Track your existing orders and shipments\n\nYour account is linked securely through Auth0. What would you like to do?",
      timestamp: "11:00:14",
    },
  },

  // === CHAT 2: "Find me a leather bag" - UCP catalog search ===
  {
    id: "c-7", type: "chat", conversation: CONV_C2,
    chat: { id: "c-7", role: "user", content: "I'm looking for a leather bag under $300. What does StyleVault have?", timestamp: "11:01:01" },
  },
  {
    id: "c-8", type: "chat", conversation: CONV_C2,
    chat: {
      id: "c-8", role: "assistant",
      content: "I found 3 leather bags under $300 on StyleVault:\n\n1. Heritage Duffle - $269.00 (4.7 stars, 93 reviews)\n2. City Tote - $199.00 (4.5 stars, 156 reviews)\n3. Compact Travel Satchel - $149.00 (4.8 stars, 72 reviews)\n\nThe Heritage Duffle is the highest-rated for travel. Want me to start a checkout for any of these?",
      timestamp: "11:01:04",
      toolCall: { name: "ucp_catalog_search", status: "success", steps: [
        { label: "UCP Catalog", description: "dev.ucp.shopping.catalog query", status: "success" },
        { label: "Auth0 Token Exchange", description: "Scoped token for ucp:catalog:read", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&subject_token_type=urn:ietf:params:oauth:token-type:access_token\n&audience=https://api.stylevault.com\n&scope=ucp:catalog:read\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"ucp:catalog:read\"\n}",
        },
        { label: "StyleVault UCP API", description: "GET /ucp/v1/catalog/search?q=leather+bag&max_price=300", status: "success",
          request: "GET /ucp/v1/catalog/search?q=leather+bag&max_price=300 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nrequest-signature: sha256=Kf8x...\nidempotency-key: idk-c8-001",
          response: "HTTP/1.1 200 OK\n{\n  \"results\": [\n    {\"name\": \"Heritage Duffle\", \"price\": 269.00, \"id\": \"bag_heritage_001\"},\n    {\"name\": \"City Tote\", \"price\": 199.00, \"id\": \"bag_city_001\"},\n    {\"name\": \"Compact Travel Satchel\", \"price\": 149.00, \"id\": \"bag_satchel_001\"}\n  ]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-search", timestamp: "11:01:04", type: "tool-call", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini searched StyleVault's product catalog via UCP. Auth0 issued a scoped token for catalog access.",
      technicalDetail: {
        protocol: "UCP: Catalog Search via dev.ucp.shopping.catalog",
        toolName: "ucp_catalog_search",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&audience=https://api.stylevault.com\n&scope=ucp:catalog:read\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"ucp:catalog:read\"\n}",
        },
        downstreamApi: {
          request: "GET /ucp/v1/catalog/search?q=leather+bag&max_price=300 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nrequest-signature: sha256=Kf8x...\nidempotency-key: idk-c8-001",
          response: "HTTP/1.1 200 OK\n{\n  \"results\": [\n    {\"name\": \"Heritage Duffle\", \"price\": 269.00},\n    {\"name\": \"City Tote\", \"price\": 199.00},\n    {\"name\": \"Compact Travel Satchel\", \"price\": 149.00}\n  ]\n}",
        },
      },
    },
  },

  // === CHAT 3: "Buy the Heritage Duffle" - UCP checkout + CIBA escalation ===
  {
    id: "c-9", type: "chat", conversation: CONV_C3,
    chat: { id: "c-9", role: "user", content: "Buy me the Heritage Duffle from StyleVault.", timestamp: "11:02:01" },
  },
  {
    id: "c-10", type: "chat", conversation: CONV_C3,
    chat: {
      id: "c-10", role: "assistant",
      content: "I'm creating a checkout session for the Heritage Duffle ($269.00). Since this exceeds the automated purchase limit, I'll need your approval to complete the transaction.",
      timestamp: "11:02:03",
      toolCall: { name: "ucp_create_checkout", status: "success", steps: [
        { label: "UCP Checkout", description: "dev.ucp.shopping.checkout session created", status: "success" },
        { label: "Auth0 Token Exchange", description: "Scoped token for ucp:checkout:session", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&audience=https://api.stylevault.com\n&scope=ucp:checkout:session\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"ucp:checkout:session\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        { label: "StyleVault UCP API", description: "POST /ucp/v1/checkout/sessions", status: "success",
          request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nidempotency-key: idk-c10-001\n\n{\n  \"line_items\": [{\"product_id\": \"bag_heritage_001\", \"quantity\": 1}],\n  \"buyer\": {\"email\": \"alex@example.com\"}\n}",
          response: "HTTP/1.1 201 Created\n{\n  \"session_id\": \"ucp_sess_7k2m9\",\n  \"status\": \"requires_escalation\",\n  \"total\": 269.00,\n  \"continue_url\": \"https://stylevault.com/ucp/escalate/7k2m9\",\n  \"messages\": [{\n    \"severity\": \"requires_buyer_input\",\n    \"text\": \"Amount $269.00 exceeds agent limit. Buyer approval required.\"\n  }]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-checkout", timestamp: "11:02:03", type: "ucp-checkout-state", result: "pending", scenarioId: "scenario-c",
      businessDescription: "Gemini created a UCP checkout session. The $269 total exceeds the agent's $250 payment authorization limit, triggering escalation to the buyer.",
      technicalDetail: {
        protocol: "UCP: Checkout Session (requires_escalation)",
        request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\n\n{\n  \"line_items\": [{\"product_id\": \"bag_heritage_001\", \"quantity\": 1}]\n}",
        response: "HTTP/1.1 201 Created\n{\n  \"session_id\": \"ucp_sess_7k2m9\",\n  \"status\": \"requires_escalation\",\n  \"total\": 269.00,\n  \"continue_url\": \"https://stylevault.com/ucp/escalate/7k2m9\"\n}",
        tokenClaims: { max_purchase_amount: "$250.00", scope: "ucp:checkout:session" },
      },
    },
  },
  {
    id: "c-11-ciba", type: "security-moment", gate: "ciba", gateId: "ciba-c", conversation: CONV_C3,
    securityMoment: {
      kind: "ciba",
      action: "Approve UCP checkout: Heritage Duffle ($269.00)",
      description: "Gemini wants to complete a Universal Commerce Protocol purchase on your behalf via StyleVault.",
      approverName: "Alex Morgan",
    },
    securityEvent: {
      id: "evt-c-ciba", timestamp: "11:02:05", type: "ciba", result: "approved", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan approved the $269.00 Heritage Duffle purchase via push notification. UCP checkout session moved from requires_escalation to completed.",
      technicalDetail: {
        protocol: "CIBA: Client-Initiated Backchannel Authentication (UCP Escalation)",
        request: "POST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"UCP Purchase: Heritage Duffle ($269.00) via Gemini\",\n  \"scope\": \"ucp:checkout:complete\"\n}",
        response: "HTTP/1.1 200 OK\n{\n  \"auth_req_id\": \"ciba-req-c01\",\n  \"expires_in\": 300,\n  \"interval\": 5\n}",
      },
    },
  },
  {
    id: "c-12", type: "chat", conversation: CONV_C3,
    chat: {
      id: "c-12", role: "assistant",
      content: "Your purchase is confirmed! Here's the summary:\n\n- Heritage Duffle - $269.00\n- Order ID: ucp_ord_9x7m1\n- Status: Confirmed\n- Estimated delivery: 3-5 business days\n\nYou'll receive a confirmation email at alex@example.com. The checkout was completed securely through UCP with Auth0 verifying your approval.",
      timestamp: "11:02:12",
      toolCall: { name: "ucp_complete_checkout", status: "success", steps: [
        { label: "UCP Checkout", description: "Session completed after buyer approval", status: "success" },
        { label: "Auth0 CIBA", description: "Buyer approval verified via backchannel", status: "success",
          request: "GET /oauth/token?auth_req_id=ciba-req-c01 HTTP/1.1\nHost: stylevault.us.auth0.com",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"scope\": \"ucp:checkout:complete\"\n}",
        },
        { label: "StyleVault UCP API", description: "POST /ucp/v1/checkout/sessions/ucp_sess_7k2m9/complete", status: "success",
          request: "POST /ucp/v1/checkout/sessions/ucp_sess_7k2m9/complete HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nidempotency-key: idk-c12-001",
          response: "HTTP/1.1 200 OK\n{\n  \"session_id\": \"ucp_sess_7k2m9\",\n  \"status\": \"completed\",\n  \"order_id\": \"ucp_ord_9x7m1\",\n  \"total\": 269.00\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-purchase", timestamp: "11:02:12", type: "ucp-payment-auth", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini completed the Heritage Duffle purchase via UCP after CIBA approval. Checkout session transitioned from requires_escalation to completed.",
      technicalDetail: {
        protocol: "UCP: Checkout Completion + AP2 Payment Authorization",
        toolName: "ucp_complete_checkout",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&scope=ucp:checkout:complete\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"scope\": \"ucp:checkout:complete\"\n}",
        },
        downstreamApi: {
          request: "POST /ucp/v1/checkout/sessions/ucp_sess_7k2m9/complete HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nidempotency-key: idk-c12-001",
          response: "HTTP/1.1 200 OK\n{\n  \"status\": \"completed\",\n  \"order_id\": \"ucp_ord_9x7m1\"\n}",
        },
      },
    },
  },

  // === CHAT 4: "Track my order" - UCP order query ===
  {
    id: "c-13", type: "chat", conversation: CONV_C4,
    chat: { id: "c-13", role: "user", content: "Can you check the status of my Heritage Duffle order?", timestamp: "11:03:01" },
  },
  {
    id: "c-14", type: "chat", conversation: CONV_C4,
    chat: {
      id: "c-14", role: "assistant",
      content: "Here's your order status:\n\n- Order ID: ucp_ord_9x7m1\n- Item: Heritage Duffle\n- Status: Processing\n- Tracking: Shipment label created, awaiting carrier pickup\n- Estimated delivery: April 14-16, 2026\n\nI'll let you know when tracking updates come in.",
      timestamp: "11:03:04",
      toolCall: { name: "ucp_get_order", status: "success", steps: [
        { label: "UCP Orders", description: "dev.ucp.shopping.orders query", status: "success" },
        { label: "Auth0 Token Exchange", description: "Scoped token for ucp:orders:read", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&audience=https://api.stylevault.com\n&scope=ucp:orders:read\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300,\n  \"scope\": \"ucp:orders:read\"\n}",
        },
        { label: "StyleVault UCP API", description: "GET /ucp/v1/orders/ucp_ord_9x7m1", status: "success",
          request: "GET /ucp/v1/orders/ucp_ord_9x7m1 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"order_id\": \"ucp_ord_9x7m1\",\n  \"status\": \"processing\",\n  \"items\": [{\"name\": \"Heritage Duffle\", \"price\": 269.00}],\n  \"shipment\": {\n    \"status\": \"label_created\",\n    \"estimated_delivery\": \"2026-04-14\"\n  }\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-orders", timestamp: "11:03:04", type: "tool-call", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini retrieved order status via UCP. Auth0 issued a read-only scoped token for order access.",
      technicalDetail: {
        protocol: "UCP: Order Management via dev.ucp.shopping.orders",
        toolName: "ucp_get_order",
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&scope=ucp:orders:read\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"scope\": \"ucp:orders:read\"\n}",
        },
        downstreamApi: {
          request: "GET /ucp/v1/orders/ucp_ord_9x7m1 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0",
          response: "HTTP/1.1 200 OK\n{\n  \"order_id\": \"ucp_ord_9x7m1\",\n  \"status\": \"processing\",\n  \"shipment\": {\"status\": \"label_created\"}\n}",
        },
      },
    },
  },

  // === CHAT 5: "Buy the Meridian Watch" - bounded authority denial ===
  {
    id: "c-15", type: "chat", conversation: CONV_C5,
    chat: { id: "c-15", role: "user", content: "I also want the Meridian Automatic Watch from my wishlist. Can you buy that too?", timestamp: "11:04:01" },
  },
  {
    id: "c-16", type: "chat", conversation: CONV_C5,
    chat: {
      id: "c-16", role: "assistant",
      content: "I can't complete that purchase. The Meridian Automatic Watch is $2,400.00, which exceeds my $250 payment authorization limit through UCP. Even with buyer escalation, this amount falls outside the bounded authority configured for AI agents.\n\nFor premium purchases like this, you can buy directly on StyleVault where additional identity verification protects high-value transactions.",
      timestamp: "11:04:03",
      toolCall: { name: "ucp_create_checkout", status: "denied", detail: "bounded_authority_exceeded: $250 (AP2)", steps: [
        { label: "UCP Checkout", description: "dev.ucp.shopping.checkout session attempted", status: "success" },
        { label: "Auth0 Token Exchange", description: "Scoped token for ucp:checkout:session", status: "success",
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&subject_token=eyJhbGciOiJSUzI1NiIs...\n&audience=https://api.stylevault.com\n&scope=ucp:checkout:session\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"scope\": \"ucp:checkout:session\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        { label: "StyleVault UCP API", description: "Rejected: $2,400 exceeds $250 AP2 bound", status: "denied",
          request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nidempotency-key: idk-c16-001\n\n{\n  \"line_items\": [{\"product_id\": \"watch_meridian_001\", \"quantity\": 1}]\n}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds AP2 max $250.00 per agent transaction\",\n  \"messages\": [{\n    \"severity\": \"unrecoverable\",\n    \"text\": \"Transaction amount exceeds agent payment authorization bounds.\"\n  }]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-bounded", timestamp: "11:04:03", type: "bounded-authority", result: "denied", scenarioId: "scenario-c",
      businessDescription: "Gemini attempted to purchase a $2,400 watch via UCP. Auth0's bounded authority claim in the AP2 token blocked the transaction at $250.",
      technicalDetail: {
        protocol: "UCP: AP2 Bounded Authority",
        request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nUCP-Agent: gemini-shopping/1.0\n\n{\"line_items\": [{\"product_id\": \"watch_meridian_001\", \"quantity\": 1}]}",
        response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds AP2 max $250.00\"\n}",
        tokenClaims: { max_purchase_amount: "$250.00", scope: "ucp:checkout:session" },
        tokenExchange: {
          request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\n\ngrant_type=urn:ietf:params:oauth:grant-type:token-exchange\n&scope=ucp:checkout:session\n&client_id=mcp_server_sv_001",
          response: "HTTP/1.1 200 OK\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"scope\": \"ucp:checkout:session\",\n  \"max_purchase_amount\": 250.00\n}",
        },
        downstreamApi: {
          request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\n\n{\"line_items\": [{\"product_id\": \"watch_meridian_001\"}]}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds AP2 max $250.00\"\n}",
        },
      },
    },
  },
];

// =============================================
// Consent / CIBA denial fallbacks
// =============================================

export const CONSENT_DENIED_STEPS_A: DemoStep[] = [
  {
    id: "consent-denied-a", type: "chat",
    chat: { id: "cd-a", role: "system", content: "Connection declined. StyleVault AI did not receive any access to your account.", timestamp: "10:00:04" },
    securityEvent: {
      id: "evt-consent-denied-a", timestamp: "10:00:04", type: "consent", result: "denied", scenarioId: "scenario-a",
      businessDescription: "Alex Morgan denied StyleVault AI access. No token was issued. Zero data exposure.",
      technicalDetail: { protocol: "OAuth 2.1", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"access_denied\",\n  \"error_description\": \"User denied the consent request\"\n}" },
    },
  },
];

const CONSENT_DENIED_STEPS_B: DemoStep[] = [
  {
    id: "consent-denied-b", type: "chat", conversation: CONV_B1,
    chat: { id: "cd-b", role: "system", content: "Connection declined. ChatGPT did not receive any access to your account.", timestamp: "10:05:04" },
    securityEvent: {
      id: "evt-consent-denied-b", timestamp: "10:05:04", type: "consent", result: "denied", scenarioId: "scenario-b",
      businessDescription: "Alex Morgan denied ChatGPT access. No token was issued.",
      technicalDetail: { protocol: "OAuth 2.1", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"access_denied\"\n}" },
    },
  },
];

export const CIBA_DENIAL_STEPS_A: Record<string, DemoStep> = {
  "ciba-a": {
    id: "ciba-denied-a", type: "chat",
    chat: {
      id: "ciba-d-a", role: "assistant",
      content: "The purchase wasn't completed. You declined the approval request. No charges were made. Let me know if you'd like to try again or look at other items instead.",
      timestamp: "10:00:25",
      toolCall: { name: "place_order", status: "denied", detail: "ciba_denied", steps: [
        { label: "MCP Server", description: "place_order called", status: "success" },
        { label: "Auth0 CIBA", description: "User denied the authorization request", status: "denied",
          request: "POST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"Purchase: Blue Denim Jacket ($79.99)\",\n  \"scope\": \"execute:purchase\"\n}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-ciba-denied-a", timestamp: "10:00:25", type: "ciba", result: "denied", scenarioId: "scenario-a",
      businessDescription: "Alex Morgan denied the CIBA approval. The jacket purchase was not executed.",
      technicalDetail: { protocol: "CIBA", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\",\n  \"error_description\": \"End-user denied the authorization request\"\n}" },
    },
  },
};

const CIBA_DENIAL_STEPS_B: Record<string, DemoStep> = {
  "ciba-b": {
    id: "ciba-denied-b", type: "chat", conversation: CONV_B3,
    chat: {
      id: "ciba-d-b", role: "assistant",
      content: "The purchase wasn't completed. You declined the approval request. No charges were made. Let me know if you'd like to try again or look at other items instead.",
      timestamp: "10:07:05",
      toolCall: { name: "place_order", status: "denied", detail: "ciba_denied", steps: [
        { label: "MCP Server", description: "place_order called", status: "success" },
        { label: "Auth0 CIBA", description: "User denied the authorization request", status: "denied",
          request: "POST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"Purchase: Heritage Duffle ($269.00)\",\n  \"scope\": \"execute:purchase\"\n}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-ciba-denied-b", timestamp: "10:07:05", type: "ciba", result: "denied", scenarioId: "scenario-b",
      businessDescription: "Alex Morgan denied the CIBA approval. The Heritage Duffle purchase was not executed.",
      technicalDetail: { protocol: "CIBA", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\",\n  \"error_description\": \"End-user denied the authorization request\"\n}" },
    },
  },
};

const CONSENT_DENIED_STEPS_C: DemoStep[] = [
  {
    id: "consent-denied-c", type: "chat", conversation: CONV_C1,
    chat: { id: "cd-c", role: "system", content: "Connection declined. Gemini did not receive any access to your StyleVault account via UCP.", timestamp: "11:00:07" },
    securityEvent: {
      id: "evt-consent-denied-c", timestamp: "11:00:07", type: "consent", result: "denied", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan denied Gemini UCP access. No token was issued.",
      technicalDetail: { protocol: "OAuth 2.1 (UCP Identity Linking)", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"access_denied\"\n}" },
    },
  },
];

const CIBA_DENIAL_STEPS_C: Record<string, DemoStep> = {
  "ciba-c": {
    id: "ciba-denied-c", type: "chat", conversation: CONV_C3,
    chat: {
      id: "ciba-d-c", role: "assistant",
      content: "The purchase wasn't completed. You declined the approval request, so the UCP checkout session has been canceled. No charges were made. Let me know if you'd like to try again or look at other items.",
      timestamp: "11:02:08",
      toolCall: { name: "ucp_complete_checkout", status: "denied", detail: "ciba_denied", steps: [
        { label: "UCP Checkout", description: "Completion attempted", status: "success" },
        { label: "Auth0 CIBA", description: "User denied the authorization request", status: "denied",
          request: "POST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"UCP Purchase: Heritage Duffle ($269.00)\",\n  \"scope\": \"ucp:checkout:complete\"\n}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-ciba-denied-c", timestamp: "11:02:08", type: "ciba", result: "denied", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan denied the CIBA approval. The UCP checkout session was canceled.",
      technicalDetail: { protocol: "CIBA (UCP Escalation)", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\"\n}" },
    },
  },
};

// =============================================
// SCENARIO_CONFIGS - exported for DemoContent
// =============================================

export const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    id: "scenario-b",
    label: "ChatGPT",
    clientName: "ChatGPT",
    clientType: "3rd-party",
    clientTheme: "chatgpt",
    description: "3rd-party AI assistant with full access. Can browse, purchase, and update preferences on your behalf.",
    scopes: ["read:wishlist", "read:orders", "read:products", "write:preferences", "execute:purchase"],
    steps: SCENARIO_B_STEPS,
    cibaDenialSteps: CIBA_DENIAL_STEPS_B,
    consentDeniedSteps: CONSENT_DENIED_STEPS_B,
  },
  {
    id: "scenario-c",
    label: "Gemini (UCP)",
    clientName: "Gemini",
    clientType: "3rd-party",
    clientTheme: "enterprise",
    description: "3rd-party AI assistant using Universal Commerce Protocol. Discovers merchant capabilities, initiates checkout, and handles payments via UCP.",
    scopes: ["ucp:catalog:read", "ucp:checkout:session", "ucp:orders:read", "ucp:identity:link"],
    steps: SCENARIO_C_STEPS,
    cibaDenialSteps: CIBA_DENIAL_STEPS_C,
    consentDeniedSteps: CONSENT_DENIED_STEPS_C,
  },
];
