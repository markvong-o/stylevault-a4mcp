import { Hono } from "hono";

const app = new Hono();

app.get("/.well-known/ucp", (c) => {
  return c.json({
    name: "StyleVault",
    ucp_version: "2026-04-08",
    description: "Premium fashion and lifestyle e-commerce",
    capabilities: [
      "dev.ucp.shopping.checkout",
      "dev.ucp.shopping.catalog",
      "dev.ucp.shopping.orders",
      "dev.ucp.shopping.identity",
    ],
    endpoints: {
      checkout: "/ucp/v1/checkout",
      catalog: "/ucp/v1/catalog",
      orders: "/ucp/v1/orders",
    },
    payment_handlers: ["stripe", "google_pay"],
    auth: {
      type: "oauth2",
      issuer: "https://stylevault.us.auth0.com",
      token_endpoint: "https://stylevault.us.auth0.com/oauth/token",
      authorization_endpoint: "https://stylevault.us.auth0.com/authorize",
    },
    extensions: [],
    contact: {
      email: "ucp@stylevault.com",
    },
  });
});

export { app as wellKnownRoutes };
