import type { MockToken } from "../types";

export const MOCK_TOKENS: MockToken[] = [
  {
    scenarioId: "scenario-a",
    label: "StyleVault AI (1st-party)",
    header: { alg: "RS256", typ: "JWT", kid: "auth0-mcp-key-1" },
    payload: {
      iss: "https://stylevault.us.auth0.com/",
      sub: "agent:cli_sv_ai_001",
      aud: "https://api.stylevault.com",
      iat: 1719849600,
      exp: 1719853200,
      scope: "read:wishlist read:orders read:products write:preferences execute:purchase",
      act: { sub: "alex@example.com" },
      max_purchase_amount: "$250.00",
    },
    color: "#22c55e",
  },
  {
    scenarioId: "scenario-b",
    label: "ChatGPT (3rd-party read)",
    header: { alg: "RS256", typ: "JWT", kid: "auth0-mcp-key-2" },
    payload: {
      iss: "https://stylevault.us.auth0.com/",
      sub: "agent:cli_chatgpt_002",
      aud: "https://api.stylevault.com",
      iat: 1719849600,
      exp: 1719849900,
      scope: "read:wishlist read:orders read:products",
      act: { sub: "alex@example.com" },
    },
    color: "#f59e0b",
  },
  {
    scenarioId: "scenario-c",
    label: "StyleScout (3rd-party constrained)",
    header: { alg: "RS256", typ: "JWT", kid: "auth0-mcp-key-3" },
    payload: {
      iss: "https://stylevault.us.auth0.com/",
      sub: "agent:cli_stylescout_003",
      aud: "https://api.stylevault.com",
      iat: 1719849600,
      exp: 1719850500,
      scope: "read:products",
      act: { sub: "alex@example.com" },
      time_bound: "15m",
    },
    color: "#B49BFC",
  },
];
