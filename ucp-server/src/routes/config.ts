import { Hono } from "hono";
import { getActiveSessions } from "../mcp/server.js";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://api.stylevault.com";

const app = new Hono();

app.get("/api/config", (c) => {
  const sessions = getActiveSessions();

  return c.json({
    server: {
      name: "StyleVault",
      version: "1.0.0",
      protocolVersion: "2025-03-26",
    },
    auth: {
      domain: AUTH0_DOMAIN,
      audience: AUTH0_AUDIENCE,
      scopes: [
        { name: "read:products", description: "Search and browse the product catalog" },
        { name: "read:wishlist", description: "View the user's saved wishlist" },
        { name: "read:orders", description: "View order history and status" },
        { name: "write:preferences", description: "Update style preferences" },
        { name: "execute:purchase", description: "Place orders on behalf of user" },
      ],
    },
    tools: [
      {
        name: "search_products",
        title: "Search Products",
        description:
          "Search the StyleVault catalog by keyword, category, or price range. Returns matching products with name, price, rating, and availability.",
        inputSchema: {
          query: { type: "string", optional: true, description: "Search keyword" },
          category: { type: "string", optional: true, description: "Filter by category" },
          max_price: { type: "number", optional: true, description: "Maximum price" },
          min_price: { type: "number", optional: true, description: "Minimum price" },
        },
      },
      {
        name: "get_product_details",
        title: "Get Product Details",
        description:
          "Get full details for a specific product by ID, including description, price, rating, review count, and stock status.",
        inputSchema: {
          product_id: { type: "string", required: true, description: "The product ID" },
        },
      },
      {
        name: "get_wishlist",
        title: "Get Wishlist",
        description:
          "Retrieve the authenticated user's saved wishlist items. Returns product details for each wishlisted item.",
        inputSchema: {},
        requiredScope: "read:wishlist",
      },
      {
        name: "get_order_history",
        title: "Get Order History",
        description:
          "Retrieve the authenticated user's past orders, including status and item details.",
        inputSchema: {},
        requiredScope: "read:orders",
      },
      {
        name: "place_order",
        title: "Place Order",
        description:
          "Place an order for a product. Enforces a $250 per-transaction limit (bounded authority).",
        inputSchema: {
          product_id: { type: "string", required: true, description: "Product ID to purchase" },
          quantity: { type: "number", required: false, description: "Quantity (default: 1)" },
        },
        requiredScope: "execute:purchase",
      },
      {
        name: "update_preferences",
        title: "Update Preferences",
        description:
          "Add style preferences to the user's profile to improve future recommendations.",
        inputSchema: {
          add: { type: "string[]", required: true, description: "Preference tags to add" },
        },
        requiredScope: "write:preferences",
      },
    ],
    sessions,
    boundedAuthority: {
      maxAgentPurchase: 250,
      currency: "USD",
      description:
        "Agent transactions exceeding this limit are rejected. The purchase requires direct buyer approval via escalation.",
    },
  });
});

export { app as configRoutes };
