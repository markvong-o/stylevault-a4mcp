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
    id: "a-2.5-token-exchange",
    type: "chat",
    chat: {
      id: "a-2.5", role: "system",
      content: "Exchanging authorization code for tokens...",
      timestamp: "10:00:03",
    },
    securityEvent: {
      id: "evt-a-token-exchange", timestamp: "10:00:03", type: "token-issued", result: "granted",
      scenarioId: "scenario-a",
      businessDescription: "Auth0 exchanged the authorization code for access and ID tokens. The access token is scoped to only the permissions Alex Morgan approved, and the ID token confirms the user's identity.",
      technicalDetail: {
        protocol: "OAuth 2.1: Authorization Code Exchange (RFC 6749 Section 4.1.3)",
        request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&code=SplxlOBeZQQYbYS6WxSbIA\n&redirect_uri=https://ai.stylevault.com/callback\n&client_id=cli_sv_ai_001\n&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        response: "HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN2LWtleS0wMDEifQ.eyJpc3MiOiJodHRwczovL3N0eWxldmF1bHQudXMuYXV0aDAuY29tIiwic3ViIjoiYXV0aDB8YWxleF9tb3JnYW4iLCJhdWQiOiJodHRwczovL2FwaS5zdHlsZXZhdWx0LmNvbSIsImlhdCI6MTcxODI0MDAwMCwiZXhwIjoxNzE4MjQzNjAwLCJzY29wZSI6InJlYWQ6d2lzaGxpc3QgcmVhZDpvcmRlcnMgcmVhZDpwcm9kdWN0cyB3cml0ZTpwcmVmZXJlbmNlcyBleGVjdXRlOnB1cmNoYXNlIiwiYXpwIjoiY2xpX3N2X2FpXzAwMSJ9.signature\",\n  \"id_token\": \"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3N0eWxldmF1bHQudXMuYXV0aDAuY29tIiwic3ViIjoiYXV0aDB8YWxleF9tb3JnYW4iLCJhdWQiOiJjbGlfc3ZfYWlfMDAxIiwibmFtZSI6IkFsZXggTW9yZ2FuIiwiZW1haWwiOiJhbGV4QGV4YW1wbGUuY29tIn0.signature\",\n  \"refresh_token\": \"v1.MRjNB4s8v9b3nKqwYktlOGhGX2...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 3600,\n  \"scope\": \"read:wishlist read:orders read:products write:preferences execute:purchase\"\n}",
        tokenClaims: {
          iss: "https://stylevault.us.auth0.com",
          sub: "auth0|alex_morgan",
          aud: "https://api.stylevault.com",
          iat: 1718240000,
          exp: 1718243600,
          scope: "read:wishlist read:orders read:products write:preferences execute:purchase",
          azp: "cli_sv_ai_001",
          "auth_time": 1718240000,
        },
        idTokenClaims: {
          iss: "https://stylevault.us.auth0.com",
          sub: "auth0|alex_morgan",
          aud: "cli_sv_ai_001",
          iat: 1718240000,
          exp: 1718243600,
          name: "Alex Morgan",
          email: "alex@example.com",
          email_verified: true,
          "auth_time": 1718240000,
          nonce: "n-0S6_WzA2Mj",
        },
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
  // === CHAT 1: "Browse my wishlist" - discovery + DCR + login + consent + successful wishlist read ===
  {
    id: "b-0.1-discovery", type: "chat", conversation: CONV_B1,
    chat: { id: "b-0.1", role: "system", content: "Discovering StyleVault MCP server and authorization requirements...", timestamp: "10:04:59" },
    securityEvent: {
      id: "evt-b-discovery", timestamp: "10:04:59", type: "mcp-discovery", result: "granted", scenarioId: "scenario-b",
      businessDescription: "ChatGPT queried StyleVault's MCP server to discover authorization requirements, then fetched Auth0's authorization server metadata. This two-step discovery tells the client where to authenticate, what scopes are available, and how to register.",
      technicalDetail: {
        protocol: "Protected Resource Metadata (RFC 9728) + Authorization Server Metadata (RFC 8414)",
        request: "// Step 1: Discover authorization server from resource\nGET /.well-known/oauth-protected-resource HTTP/1.1\nHost: mcp.stylevault.com\n\n// Step 2: Discover authorization server capabilities\nGET /.well-known/oauth-authorization-server HTTP/1.1\nHost: stylevault.us.auth0.com",
        response: "// Step 1: Protected Resource Metadata\nHTTP/1.1 200 OK\n{\n  \"resource\": \"https://mcp.stylevault.com\",\n  \"authorization_servers\": [\n    \"https://stylevault.us.auth0.com\"\n  ],\n  \"scopes_supported\": [\n    \"read:wishlist\", \"read:orders\",\n    \"read:products\", \"write:preferences\",\n    \"execute:purchase\"\n  ],\n  \"bearer_methods_supported\": [\"header\"]\n}\n\n// Step 2: Authorization Server Metadata\nHTTP/1.1 200 OK\n{\n  \"issuer\": \"https://stylevault.us.auth0.com\",\n  \"authorization_endpoint\": \"https://stylevault.us.auth0.com/authorize\",\n  \"token_endpoint\": \"https://stylevault.us.auth0.com/oauth/token\",\n  \"registration_endpoint\": \"https://stylevault.us.auth0.com/oidc/register\",\n  \"scopes_supported\": [\"openid\", \"profile\", \"read:wishlist\", \"read:orders\", \"read:products\", \"write:preferences\", \"execute:purchase\"],\n  \"grant_types_supported\": [\"authorization_code\", \"refresh_token\"],\n  \"code_challenge_methods_supported\": [\"S256\"],\n  \"response_types_supported\": [\"code\"]\n}",
      },
    },
  },
  {
    id: "b-0.2-dcr", type: "chat", conversation: CONV_B1,
    chat: { id: "b-0.2", role: "system", content: "Registering client with Auth0 via Dynamic Client Registration...", timestamp: "10:05:00" },
    securityEvent: {
      id: "evt-b-dcr", timestamp: "10:05:00", type: "mcp-dcr", result: "granted", scenarioId: "scenario-b",
      businessDescription: "ChatGPT dynamically registered as a client with Auth0. New AI agents onboard without pre-configuration -- Auth0 issues a client_id and credentials on the fly via Dynamic Client Registration (RFC 7591).",
      technicalDetail: {
        protocol: "Dynamic Client Registration (RFC 7591)",
        request: "POST /oidc/register HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/json\n\n{\n  \"client_name\": \"ChatGPT\",\n  \"redirect_uris\": [\"https://chatgpt.com/callback\"],\n  \"grant_types\": [\"authorization_code\", \"refresh_token\"],\n  \"response_types\": [\"code\"],\n  \"token_endpoint_auth_method\": \"none\",\n  \"scope\": \"read:wishlist read:orders read:products write:preferences execute:purchase\"\n}",
        response: "HTTP/1.1 201 Created\n{\n  \"client_id\": \"cli_chatgpt_002\",\n  \"client_name\": \"ChatGPT\",\n  \"registration_access_token\": \"reg_tok_Xk9pLm3v...\",\n  \"grant_types\": [\"authorization_code\", \"refresh_token\"],\n  \"redirect_uris\": [\"https://chatgpt.com/callback\"]\n}",
      },
    },
  },
  {
    id: "b-1", type: "chat", conversation: CONV_B1,
    chat: { id: "b-1", role: "system", content: "ChatGPT connected to StyleVault MCP server.", timestamp: "10:05:01" },
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
    id: "b-2.5-token-exchange", type: "chat", conversation: CONV_B1,
    chat: { id: "b-2.5", role: "system", content: "Exchanging authorization code for tokens...", timestamp: "10:05:03" },
    securityEvent: {
      id: "evt-b-token-exchange", timestamp: "10:05:03", type: "token-issued", result: "granted", scenarioId: "scenario-b",
      businessDescription: "Auth0 exchanged the authorization code for access and ID tokens. The access token is scoped to only the permissions Alex Morgan approved, and the ID token confirms the user's identity.",
      technicalDetail: {
        protocol: "OAuth 2.1: Authorization Code Exchange (RFC 6749 Section 4.1.3)",
        request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&code=Qcb0Orv1zh30vL\n&redirect_uri=https://chatgpt.com/callback\n&client_id=cli_chatgpt_002\n&code_verifier=y3kTR8G7xQz1mN5vJ2wL9pS4bF0hD6aE8cU",
        response: "HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN2LWtleS0wMDEifQ.eyJpc3MiOiJodHRwczovL3N0eWxldmF1bHQudXMuYXV0aDAuY29tIiwic3ViIjoiYXV0aDB8YWxleF9tb3JnYW4iLCJhdWQiOiJodHRwczovL2FwaS5zdHlsZXZhdWx0LmNvbSIsImlhdCI6MTcxODI0MDMwMCwiZXhwIjoxNzE4MjQzOTAwLCJzY29wZSI6InJlYWQ6d2lzaGxpc3QgcmVhZDpvcmRlcnMgcmVhZDpwcm9kdWN0cyB3cml0ZTpwcmVmZXJlbmNlcyBleGVjdXRlOnB1cmNoYXNlIiwiYXpwIjoiY2xpX2NoYXRncHRfMDAyIn0.signature\",\n  \"id_token\": \"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3N0eWxldmF1bHQudXMuYXV0aDAuY29tIiwic3ViIjoiYXV0aDB8YWxleF9tb3JnYW4iLCJhdWQiOiJjbGlfY2hhdGdwdF8wMDIiLCJuYW1lIjoiQWxleCBNb3JnYW4iLCJlbWFpbCI6ImFsZXhAZXhhbXBsZS5jb20ifQ.signature\",\n  \"refresh_token\": \"v1.Qx8mNp3kR7tW2vL5jS9bF4hY...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 3600,\n  \"scope\": \"read:wishlist read:orders read:products write:preferences execute:purchase\"\n}",
        tokenClaims: {
          iss: "https://stylevault.us.auth0.com",
          sub: "auth0|alex_morgan",
          aud: "https://api.stylevault.com",
          iat: 1718240300,
          exp: 1718243900,
          scope: "read:wishlist read:orders read:products write:preferences execute:purchase",
          azp: "cli_chatgpt_002",
          "auth_time": 1718240300,
        },
        idTokenClaims: {
          iss: "https://stylevault.us.auth0.com",
          sub: "auth0|alex_morgan",
          aud: "cli_chatgpt_002",
          iat: 1718240300,
          exp: 1718243900,
          name: "Alex Morgan",
          email: "alex@example.com",
          email_verified: true,
          "auth_time": 1718240300,
          nonce: "q-7T4_XyB3Nk",
        },
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
  // === CHAT 1: "Discover StyleVault store" - UCP discovery + login + consent ===
  {
    id: "c-0.1-manifest", type: "chat", conversation: CONV_C1,
    chat: { id: "c-0.1", role: "system", content: "Resolving StyleVault UCP merchant manifest...", timestamp: "10:59:58" },
    securityEvent: {
      id: "evt-c-manifest", timestamp: "10:59:58", type: "ucp-discovery", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini fetched StyleVault's UCP merchant manifest to discover available commerce capabilities, endpoints, and supported payment methods. The manifest is publicly accessible at /.well-known/ucp.",
      technicalDetail: {
        protocol: "UCP: Merchant Manifest Discovery (/.well-known/ucp)",
        request: "GET /.well-known/ucp HTTP/1.1\nHost: stylevault.com",
        response: "HTTP/1.1 200 OK\n{\n  \"ucp\": { \"version\": \"2026-04-08\" },\n  \"name\": \"StyleVault\",\n  \"capabilities\": {\n    \"dev.ucp.shopping.checkout\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.catalog\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.orders\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.identity\": {\n      \"versions\": [\"1.0.0\"],\n      \"auth\": {\n        \"type\": \"oauth2\",\n        \"issuer\": \"https://stylevault.us.auth0.com\"\n      }\n    }\n  },\n  \"payment\": {\n    \"handlers\": [\n      { \"id\": \"com.stripe\", \"display_name\": \"Stripe\" },\n      { \"id\": \"com.google.pay\", \"display_name\": \"Google Pay\" }\n    ]\n  },\n  \"signing_keys\": [{ \"kid\": \"sv-ucp-key-001\", \"kty\": \"RSA\" }]\n}",
      },
    },
  },
  {
    id: "c-0.2-profile", type: "chat", conversation: CONV_C1,
    chat: { id: "c-0.2", role: "system", content: "Negotiating capabilities with StyleVault...", timestamp: "10:59:59" },
    securityEvent: {
      id: "evt-c-profile", timestamp: "10:59:59", type: "ucp-discovery", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini and StyleVault exchanged capability profiles and signing keys. The merchant verified Gemini's identity via HTTP Message Signatures (RFC 9421) and computed the intersection of supported capabilities.",
      technicalDetail: {
        protocol: "UCP: Agent Profile Exchange + Capability Negotiation (RFC 9421)",
        request: "// Gemini sends its profile URL and signs all requests:\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(\"@method\" \"@target-uri\"); keyid=\"gemini-key-001\"; alg=\"rsa-v1_5-sha256\"\nrequest-id: req-c02-001\n\n// StyleVault fetches Gemini's profile:\nGET /.well-known/ucp HTTP/1.1\nHost: gemini.google.com",
        response: "HTTP/1.1 200 OK\n{\n  \"name\": \"Gemini Shopping\",\n  \"ucp\": { \"version\": \"2026-04-08\" },\n  \"capabilities\": {\n    \"dev.ucp.shopping.checkout\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.catalog\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.orders\": { \"versions\": [\"1.0.0\"] }\n  },\n  \"payment\": {\n    \"handlers\": [{ \"id\": \"com.google.pay\" }]\n  },\n  \"signing_keys\": [{ \"kid\": \"gemini-key-001\", \"kty\": \"RSA\" }]\n}\n\n// Negotiated intersection:\n// Capabilities: checkout, catalog, orders\n// Payment: com.google.pay",
      },
    },
  },
  {
    id: "c-1", type: "chat", conversation: CONV_C1,
    chat: { id: "c-1", role: "system", content: "Gemini connected to StyleVault via Universal Commerce Protocol.", timestamp: "11:00:01" },
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
      businessDescription: "Gemini discovered StyleVault's UCP capabilities. StyleVault verified Gemini's request signature against the agent's published public key before exposing merchant endpoints.",
      technicalDetail: {
        protocol: "UCP: Capability Discovery via /.well-known/ucp (RFC 9421)",
        request: "GET /.well-known/ucp HTTP/1.1\nHost: stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(\"@method\" \"@target-uri\"); keyid=\"gemini-key-001\"\nrequest-id: req-c03-001",
        response: "HTTP/1.1 200 OK\n{\n  \"ucp\": { \"version\": \"2026-04-08\" },\n  \"name\": \"StyleVault\",\n  \"capabilities\": {\n    \"dev.ucp.shopping.checkout\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.catalog\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.orders\": { \"versions\": [\"1.0.0\"] },\n    \"dev.ucp.shopping.identity\": {\n      \"auth\": { \"type\": \"oauth2\", \"issuer\": \"https://stylevault.us.auth0.com\" }\n    }\n  },\n  \"payment\": { \"handlers\": [{ \"id\": \"com.stripe\" }, { \"id\": \"com.google.pay\" }] },\n  \"signing_keys\": [{ \"kid\": \"sv-ucp-key-001\" }]\n}",
      },
    },
  },
  {
    id: "c-3-consent", type: "security-moment", gate: "consent", gateId: "consent-c", conversation: CONV_C1,
    securityMoment: {
      kind: "consent", clientName: "Gemini", productName: "StyleVault",
      scopes: [
        { scope: "openid", label: "Verify your identity", icon: "user" },
        { scope: "profile", label: "Access your profile", icon: "user" },
        { scope: "email", label: "Read your email address", icon: "package" },
        { scope: "offline_access", label: "Stay signed in", icon: "search" },
      ],
      onApprove: "consent-c-approved", onDeny: "consent-c-denied",
    },
    securityEvent: {
      id: "evt-c-consent", timestamp: "11:00:05", type: "consent", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan authorized Identity Linking between Gemini and StyleVault via Auth0. This connects Alex's account so Gemini can access user-specific data like order history. Commerce capabilities (catalog, checkout) are authorized separately through UCP capability negotiation.",
      technicalDetail: {
        protocol: "OAuth 2.0: Identity Linking (dev.ucp.shopping.identity)",
        request: "POST /authorize HTTP/1.1\nHost: stylevault.us.auth0.com\nresponse_type=code\n&scope=openid profile email offline_access\n&client_id=cli_gemini_003",
        response: "HTTP/1.1 302 Found\nLocation: /callback?code=Xk9pLm3vRt7wYz",
      },
    },
  },
  {
    id: "c-3.5-token-exchange", type: "chat", conversation: CONV_C1,
    chat: { id: "c-3.5", role: "system", content: "Exchanging authorization code for tokens...", timestamp: "11:00:06" },
    securityEvent: {
      id: "evt-c-token-exchange", timestamp: "11:00:06", type: "token-issued", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Auth0 exchanged the authorization code for access and ID tokens for Identity Linking. The access token grants Gemini access to Alex's account data (orders, profile). Commerce capabilities (catalog, checkout) are authorized separately through UCP's HTTP Message Signatures.",
      technicalDetail: {
        protocol: "OAuth 2.0: Identity Linking Token Exchange (RFC 6749 Section 4.1.3)",
        request: "POST /oauth/token HTTP/1.1\nHost: stylevault.us.auth0.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&code=Xk9pLm3vRt7wYz\n&redirect_uri=https://gemini.google.com/callback\n&client_id=cli_gemini_003\n&code_verifier=pZ8xR3mK7tQ1wN5vJ9yL2sB4fH6gD0aE",
        response: "HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  \"access_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"id_token\": \"eyJhbGciOiJSUzI1NiIs...\",\n  \"refresh_token\": \"v1.Tk7nWp2xR9mK3vL6jS1bH4qY...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 3600,\n  \"scope\": \"openid profile email offline_access\"\n}",
        tokenClaims: {
          iss: "https://stylevault.us.auth0.com",
          sub: "auth0|alex_morgan",
          aud: "https://api.stylevault.com",
          iat: 1718240600,
          exp: 1718244200,
          scope: "openid profile email offline_access",
          azp: "cli_gemini_003",
          "auth_time": 1718240600,
        },
        idTokenClaims: {
          iss: "https://stylevault.us.auth0.com",
          sub: "auth0|alex_morgan",
          aud: "cli_gemini_003",
          iat: 1718240600,
          exp: 1718244200,
          name: "Alex Morgan",
          email: "alex@example.com",
          email_verified: true,
          "auth_time": 1718240600,
          nonce: "r-2V8_ZwC5Pk",
        },
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
        { label: "HTTP Message Signature", description: "Agent signs request with private key (RFC 9421)", status: "success",
          request: "// Gemini signs the request using its private key.\n// StyleVault verifies against Gemini's published\n// signing_keys from the agent profile.\n\nkeyid: gemini-key-001\nalg: rsa-v1_5-sha256\ncovered-components: \"@method\" \"@target-uri\" \"ucp-agent\"",
          response: "// Signature verified against agent's public key.\n// No OAuth token needed for catalog access --\n// catalog is a UCP capability authorized via\n// capability negotiation, not Identity Linking.",
        },
        { label: "StyleVault UCP API", description: "GET /ucp/v1/catalog/search?q=leather+bag&max_price=300", status: "success",
          request: "GET /ucp/v1/catalog/search?q=leather+bag&max_price=300 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(\"@method\" \"@target-uri\" \"ucp-agent\"); keyid=\"gemini-key-001\"\nidempotency-key: idk-c8-001\nrequest-id: req-c08-001",
          response: "HTTP/1.1 200 OK\n{\n  \"results\": [\n    {\"name\": \"Heritage Duffle\", \"price\": 269.00, \"id\": \"bag_heritage_001\"},\n    {\"name\": \"City Tote\", \"price\": 199.00, \"id\": \"bag_city_001\"},\n    {\"name\": \"Compact Travel Satchel\", \"price\": 149.00, \"id\": \"bag_satchel_001\"}\n  ]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-search", timestamp: "11:01:04", type: "tool-call", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini searched StyleVault's product catalog via UCP. Catalog access is authorized through UCP capability negotiation and verified via HTTP Message Signatures -- no OAuth token is needed for this operation.",
      technicalDetail: {
        protocol: "UCP: Catalog Search via dev.ucp.shopping.catalog (RFC 9421)",
        toolName: "ucp_catalog_search",
        tokenExchange: {
          request: "// No OAuth token exchange for catalog access.\n// Gemini authenticates via HTTP Message Signature:\n\nrequest-signature: sig1=(\"@method\" \"@target-uri\" \"ucp-agent\");\n  keyid=\"gemini-key-001\";\n  alg=\"rsa-v1_5-sha256\"",
          response: "// StyleVault verifies signature against Gemini's\n// published public key from the agent profile.\n// Capability was authorized during negotiation.",
        },
        downstreamApi: {
          request: "GET /ucp/v1/catalog/search?q=leather+bag&max_price=300 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(\"@method\" \"@target-uri\" \"ucp-agent\"); keyid=\"gemini-key-001\"\nidempotency-key: idk-c8-001",
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
        { label: "HTTP Message Signature", description: "Agent signs checkout request (RFC 9421)", status: "success",
          request: "// Gemini signs the checkout request with its private key.\n// Identity Linking token attached for buyer association.\n\nkeyid: gemini-key-001\nalg: rsa-v1_5-sha256\ncovered-components: \"@method\" \"@target-uri\" \"content-type\" \"ucp-agent\"",
          response: "// Signature verified. Buyer identity confirmed\n// via Identity Linking token (Auth0).\n// Merchant policy: $250 agent transaction limit.",
        },
        { label: "StyleVault UCP API", description: "POST /ucp/v1/checkout/sessions", status: "success",
          request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: gemini-shopping/1.0\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nidempotency-key: idk-c10-001\n\n{\n  \"line_items\": [{\"product_id\": \"bag_heritage_001\", \"quantity\": 1}],\n  \"buyer\": {\"email\": \"alex@example.com\"}\n}",
          response: "HTTP/1.1 201 Created\n{\n  \"session_id\": \"ucp_sess_7k2m9\",\n  \"status\": \"requires_escalation\",\n  \"total\": 269.00,\n  \"continue_url\": \"https://stylevault.com/ucp/escalate/7k2m9\",\n  \"messages\": [{\n    \"severity\": \"requires_buyer_input\",\n    \"text\": \"Amount $269.00 exceeds agent limit. Buyer approval required.\"\n  }]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-checkout", timestamp: "11:02:03", type: "ucp-checkout-state", result: "pending", scenarioId: "scenario-c",
      businessDescription: "Gemini created a UCP checkout session. The $269 total exceeds StyleVault's $250 merchant policy limit for agent transactions, triggering escalation to the buyer via continue_url.",
      technicalDetail: {
        protocol: "UCP: Checkout Session (requires_escalation + continue_url)",
        request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\n\n{\n  \"line_items\": [{\"product_id\": \"bag_heritage_001\", \"quantity\": 1}]\n}",
        response: "HTTP/1.1 201 Created\n{\n  \"session_id\": \"ucp_sess_7k2m9\",\n  \"status\": \"requires_escalation\",\n  \"total\": 269.00,\n  \"continue_url\": \"https://stylevault.com/ucp/escalate/7k2m9\"\n}",
        tokenClaims: { merchant_agent_limit: "$250.00", enforcement: "server-side policy" },
      },
    },
  },
  {
    id: "c-11-ciba", type: "security-moment", gate: "ciba", gateId: "ciba-c", conversation: CONV_C3,
    securityMoment: {
      kind: "ciba",
      action: "Approve UCP checkout: Heritage Duffle ($269.00)",
      description: "UCP returned a continue_url for buyer approval. StyleVault uses Auth0 CIBA behind this URL to verify your identity and authorize the purchase.",
      approverName: "Alex Morgan",
    },
    securityEvent: {
      id: "evt-c-ciba", timestamp: "11:02:05", type: "ciba", result: "approved", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan approved the $269.00 Heritage Duffle purchase via push notification. UCP's checkout session moved from requires_escalation to completed. StyleVault uses Auth0 CIBA behind the continue_url to handle buyer approval.",
      technicalDetail: {
        protocol: "Auth0 CIBA: Buyer Approval via continue_url",
        request: "// UCP returned continue_url: https://stylevault.com/ucp/escalate/7k2m9\n// StyleVault handles buyer approval via Auth0 CIBA:\n\nPOST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"UCP Purchase: Heritage Duffle ($269.00) via Gemini\",\n  \"scope\": \"openid\"\n}",
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
        { label: "Buyer Approval (continue_url)", description: "StyleVault verified approval via Auth0 CIBA", status: "success",
          request: "// StyleVault's continue_url flow completed.\n// Auth0 CIBA confirmed buyer identity.\n\nGET /oauth/token?auth_req_id=ciba-req-c01 HTTP/1.1\nHost: stylevault.us.auth0.com",
          response: "HTTP/1.1 200 OK\n// StyleVault issues escalation token after\n// Auth0 CIBA confirms buyer approval.\n{\n  \"escalation_token\": \"esc_7k2m9_approved\"\n}",
        },
        { label: "StyleVault UCP API", description: "POST /ucp/v1/checkout/sessions/ucp_sess_7k2m9/complete", status: "success",
          request: "POST /ucp/v1/checkout/sessions/ucp_sess_7k2m9/complete HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\nX-UCP-Escalation-Token: esc_7k2m9_approved\nidempotency-key: idk-c12-001",
          response: "HTTP/1.1 200 OK\n{\n  \"session_id\": \"ucp_sess_7k2m9\",\n  \"status\": \"completed\",\n  \"order_id\": \"ucp_ord_9x7m1\",\n  \"total\": 269.00\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-purchase", timestamp: "11:02:12", type: "ucp-payment-auth", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini completed the Heritage Duffle purchase via UCP after buyer approval through StyleVault's continue_url (powered by Auth0 CIBA). Checkout session transitioned from requires_escalation to completed.",
      technicalDetail: {
        protocol: "UCP: Checkout Completion (continue_url + Auth0 CIBA)",
        toolName: "ucp_complete_checkout",
        tokenExchange: {
          request: "// Buyer approval obtained via continue_url flow.\n// StyleVault verified identity via Auth0 CIBA.\n// Escalation token issued to confirm approval.\n\nX-UCP-Escalation-Token: esc_7k2m9_approved",
          response: "// Escalation token validated. Checkout session\n// transitions: requires_escalation -> completed",
        },
        downstreamApi: {
          request: "POST /ucp/v1/checkout/sessions/ucp_sess_7k2m9/complete HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\nX-UCP-Escalation-Token: esc_7k2m9_approved\nidempotency-key: idk-c12-001",
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
        { label: "Auth0 Identity Linking", description: "Bearer token for user-specific order data", status: "success",
          request: "// Order data is user-specific, so this request\n// requires the Identity Linking token from Auth0.\n// HTTP Message Signature also included.\n\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\n(scope: openid profile email offline_access)",
          response: "// Auth0 token validated. User identity confirmed.\n// Order data scoped to auth0|alex_morgan.",
        },
        { label: "StyleVault UCP API", description: "GET /ucp/v1/orders/ucp_ord_9x7m1", status: "success",
          request: "GET /ucp/v1/orders/ucp_ord_9x7m1 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
          response: "HTTP/1.1 200 OK\n{\n  \"order_id\": \"ucp_ord_9x7m1\",\n  \"status\": \"processing\",\n  \"items\": [{\"name\": \"Heritage Duffle\", \"price\": 269.00}],\n  \"shipment\": {\n    \"status\": \"label_created\",\n    \"estimated_delivery\": \"2026-04-14\"\n  }\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-orders", timestamp: "11:03:04", type: "tool-call", result: "granted", scenarioId: "scenario-c",
      businessDescription: "Gemini retrieved order status via UCP. Because order data is user-specific, Auth0's Identity Linking token authenticates the request alongside the agent's HTTP Message Signature.",
      technicalDetail: {
        protocol: "UCP: Order Management via dev.ucp.shopping.orders (Identity Linking)",
        toolName: "ucp_get_order",
        tokenExchange: {
          request: "// Order data requires Identity Linking (user-specific).\n// Auth0 Bearer token proves Gemini is acting for Alex.\n// HTTP Message Signature proves Gemini's agent identity.\n\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"",
          response: "// Both authentication layers validated.\n// Agent identity: gemini-shopping/1.0 (signature)\n// User identity: auth0|alex_morgan (OAuth token)",
        },
        downstreamApi: {
          request: "GET /ucp/v1/orders/ucp_ord_9x7m1 HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...",
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
      toolCall: { name: "ucp_create_checkout", status: "denied", detail: "bounded_authority_exceeded: $250 merchant policy", steps: [
        { label: "UCP Checkout", description: "dev.ucp.shopping.checkout session attempted", status: "success" },
        { label: "HTTP Message Signature", description: "Agent signs checkout request (RFC 9421)", status: "success",
          request: "// Gemini signs the checkout request.\n\nkeyid: gemini-key-001\nalg: rsa-v1_5-sha256\ncovered-components: \"@method\" \"@target-uri\" \"content-type\" \"ucp-agent\"",
          response: "// Signature verified. Request authenticated.\n// Merchant policy evaluation follows.",
        },
        { label: "StyleVault UCP API", description: "Rejected: $2,400 exceeds $250 merchant policy", status: "denied",
          request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\nidempotency-key: idk-c16-001\n\n{\n  \"line_items\": [{\"product_id\": \"watch_meridian_001\", \"quantity\": 1}]\n}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds merchant agent policy limit of $250.00\",\n  \"messages\": [{\n    \"severity\": \"unrecoverable\",\n    \"text\": \"Transaction amount exceeds merchant-configured agent transaction limit.\"\n  }]\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-c-bounded", timestamp: "11:04:03", type: "bounded-authority", result: "denied", scenarioId: "scenario-c",
      businessDescription: "Gemini attempted to purchase a $2,400 watch via UCP. StyleVault's merchant-configured agent transaction policy ($250 limit) blocked the request before it reached the checkout engine.",
      technicalDetail: {
        protocol: "UCP: Merchant Agent Policy Enforcement",
        request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\n\n{\"line_items\": [{\"product_id\": \"watch_meridian_001\", \"quantity\": 1}]}",
        response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds merchant agent policy limit of $250.00\"\n}",
        tokenClaims: { merchant_agent_limit: "$250.00", enforcement: "server-side policy" },
        tokenExchange: {
          request: "// No OAuth token exchange for checkout.\n// Agent authenticates via HTTP Message Signature.\n// Merchant policy enforced server-side.\n\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"",
          response: "// Signature verified. Merchant policy evaluated:\n// $2,400.00 > $250.00 agent limit = DENIED",
        },
        downstreamApi: {
          request: "POST /ucp/v1/checkout/sessions HTTP/1.1\nHost: api.stylevault.com\nUCP-Agent: profile=\"https://gemini.google.com/.well-known/ucp\"\nrequest-signature: sig1=(...); keyid=\"gemini-key-001\"\n\n{\"line_items\": [{\"product_id\": \"watch_meridian_001\"}]}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"bounded_authority_exceeded\",\n  \"error_description\": \"$2,400.00 exceeds merchant agent policy limit of $250.00\"\n}",
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
      technicalDetail: { protocol: "OAuth 2.0 (Identity Linking)", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"access_denied\"\n}" },
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
          request: "// StyleVault's continue_url buyer approval:\nPOST /bc-authorize HTTP/1.1\nHost: stylevault.us.auth0.com\n\n{\n  \"login_hint\": \"alex@example.com\",\n  \"binding_message\": \"UCP Purchase: Heritage Duffle ($269.00)\",\n  \"scope\": \"openid\"\n}",
          response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\"\n}",
        },
      ] },
    },
    securityEvent: {
      id: "evt-ciba-denied-c", timestamp: "11:02:08", type: "ciba", result: "denied", scenarioId: "scenario-c",
      businessDescription: "Alex Morgan denied the CIBA approval. The UCP checkout session was canceled.",
      technicalDetail: { protocol: "Auth0 CIBA (StyleVault Buyer Approval)", response: "HTTP/1.1 403 Forbidden\n{\n  \"error\": \"authorization_declined\"\n}" },
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
    scopes: ["openid", "profile", "email", "offline_access"],
    steps: SCENARIO_C_STEPS,
    cibaDenialSteps: CIBA_DENIAL_STEPS_C,
    consentDeniedSteps: CONSENT_DENIED_STEPS_C,
  },
];
