import { Hono } from "hono";
import { eventBus } from "./mcp/event-bus.js";

const app = new Hono();

app.get("/.well-known/ucp", (c) => {
  const userAgent = c.req.header("user-agent") || "unknown";

  eventBus.push({
    type: "ucp-discovery",
    result: "info",
    summary: "UCP Merchant Manifest requested (/.well-known/ucp)",
    details: {
      method: "GET",
      path: "/.well-known/ucp",
      headers: { "user-agent": userAgent },
      responseBody: {
        name: "StyleVault",
        version: "2026-04-08",
        capabilities: [
          "dev.ucp.shopping.checkout",
          "dev.ucp.shopping.catalog",
          "dev.ucp.shopping.orders",
          "dev.ucp.shopping.identity",
        ],
      },
    },
  });

  return c.json({
    ucp: {
      version: "2026-04-08",
      services: [
        {
          name: "shopping",
          version: "1.0.0",
          endpoint: "https://api.stylevault.com/shopping",
        },
      ],
    },
    name: "StyleVault",
    description: "Premium fashion and lifestyle e-commerce",
    capabilities: {
      "dev.ucp.shopping.checkout": {
        versions: ["1.0.0"],
        endpoints: {
          "checkout-sessions": "POST /ucp/v1/checkout/sessions",
          "checkout-session": "GET /ucp/v1/checkout/sessions/:id",
          "complete": "POST /ucp/v1/checkout/sessions/:id/complete",
        },
      },
      "dev.ucp.shopping.catalog": {
        versions: ["1.0.0"],
        endpoints: {
          search: "GET /ucp/v1/catalog/search",
          product: "GET /ucp/v1/catalog/products/:id",
        },
      },
      "dev.ucp.shopping.orders": {
        versions: ["1.0.0"],
        endpoints: {
          order: "GET /ucp/v1/orders/:id",
          list: "GET /ucp/v1/orders",
        },
        webhooks: "https://api.stylevault.com/webhooks/orders",
      },
      "dev.ucp.shopping.identity": {
        versions: ["1.0.0"],
        auth: {
          type: "oauth2",
          issuer: "https://stylevault.us.auth0.com",
          authorization_endpoint: "https://stylevault.us.auth0.com/authorize",
          token_endpoint: "https://stylevault.us.auth0.com/oauth/token",
        },
      },
    },
    payment: {
      handlers: [
        { id: "com.stripe", display_name: "Stripe" },
        { id: "com.google.pay", display_name: "Google Pay" },
      ],
    },
    signing_keys: [
      {
        kty: "RSA",
        kid: "sv-ucp-key-001",
        use: "sig",
        alg: "RS256",
        n: "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM...",
        e: "AQAB",
      },
    ],
    extensions: [],
    contact: {
      email: "ucp@stylevault.com",
    },
  });
});

export { app as wellKnownRoutes };
