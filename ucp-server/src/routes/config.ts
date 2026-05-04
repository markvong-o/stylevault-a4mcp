import { Hono } from "hono";
import { getActiveSessions } from "../mcp/server.js";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://app.retailzero.mvbuilt.com/api";

const app = new Hono();

app.get("/api/config", (c) => {
  const sessions = getActiveSessions();

  return c.json({
    server: {
      name: "RetailZero",
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
    toolGroups: [
      {
        id: "mcp",
        label: "MCP Tools",
        subtitle: "ChatGPT Apps / Claude",
        endpoint: "/mcp",
        transport: "Streamable HTTP (JSON-RPC)",
        accentColor: "#10a37f",
        tools: [
          {
            name: "search_products",
            title: "Search Products",
            description:
              "Search the RetailZero catalog by keyword, category, or price range. Returns matching products with name, price, rating, and availability.",
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
      },
      {
        id: "ucp-rest",
        label: "UCP REST Endpoints",
        subtitle: "Gemini (Native UCP)",
        endpoint: "/ucp/v1/*",
        transport: "REST API",
        accentColor: "#4285f4",
        tools: [
          {
            name: "/.well-known/ucp",
            title: "UCP Manifest Discovery",
            description:
              "Public manifest advertising merchant capabilities, supported actions, payment handlers, and the authorization server URL (Auth0).",
            inputSchema: {},
          },
          {
            name: "GET /ucp/v1/catalog/search",
            title: "Catalog Search",
            description:
              "Search the product catalog by keyword, category, or price range. Returns matching products with pricing and availability.",
            inputSchema: {
              q: { type: "string", optional: true, description: "Search keyword" },
              category: { type: "string", optional: true, description: "Filter by category" },
              max_price: { type: "number", optional: true, description: "Maximum price" },
              min_price: { type: "number", optional: true, description: "Minimum price" },
            },
            requiredScope: "read:products",
          },
          {
            name: "GET /ucp/v1/catalog/products/:id",
            title: "Get Product Details",
            description:
              "Retrieve full details for a specific product by ID, including description, pricing, ratings, and stock status.",
            inputSchema: {
              id: { type: "string", required: true, description: "Product ID (path param)" },
            },
            requiredScope: "read:products",
          },
          {
            name: "POST /ucp/v1/checkout/sessions",
            title: "Create Checkout Session",
            description:
              "Create a UCP checkout session with line items. Implements the checkout state machine with bounded authority enforcement ($250 cap).",
            inputSchema: {
              line_items: { type: "array", required: true, description: "Products and quantities" },
              buyer_email: { type: "string", optional: true, description: "Buyer email" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "GET /ucp/v1/checkout/sessions/:id",
            title: "Get Checkout Status",
            description:
              "Poll the current state of a checkout session. Returns status, line items, messages, and escalation info.",
            inputSchema: {
              id: { type: "string", required: true, description: "Session ID (path param)" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "POST /ucp/v1/checkout/sessions/:id/complete",
            title: "Complete Checkout",
            description:
              "Complete a checkout session. For escalated sessions, requires buyer approval token obtained via Auth0 CIBA.",
            inputSchema: {
              id: { type: "string", required: true, description: "Session ID (path param)" },
              escalation_token: { type: "string", optional: true, description: "CIBA approval token" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "POST /ucp/v1/checkout/sessions/:id/cancel",
            title: "Cancel Checkout",
            description:
              "Cancel an in-progress checkout session. Transitions the session to canceled state.",
            inputSchema: {
              id: { type: "string", required: true, description: "Session ID (path param)" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "GET /ucp/v1/orders",
            title: "List Orders",
            description:
              "Retrieve the authenticated user's order history with status and item details.",
            inputSchema: {},
            requiredScope: "read:orders",
          },
          {
            name: "GET /ucp/v1/orders/:id",
            title: "Get Order Details",
            description:
              "Retrieve a specific order by ID, including line items, total, and fulfillment status.",
            inputSchema: {
              id: { type: "string", required: true, description: "Order ID (path param)" },
            },
            requiredScope: "read:orders",
          },
        ],
      },
      {
        id: "ucp-over-mcp",
        label: "UCP-over-MCP Tools",
        subtitle: "Gemini (UCP over MCP transport)",
        endpoint: "/gemini-mcp",
        transport: "Streamable HTTP (JSON-RPC)",
        accentColor: "#9C27B0",
        tools: [
          {
            name: "ucp_discover",
            title: "Discover UCP Capabilities",
            description:
              "Returns the merchant's UCP manifest including supported capabilities (catalog, checkout, orders), authentication config (Auth0), payment handlers, and signing keys.",
            inputSchema: {},
          },
          {
            name: "ucp_catalog_search",
            title: "Search Catalog (UCP)",
            description:
              "Search the product catalog by keyword, category, or price range. Equivalent to UCP GET /ucp/v1/catalog/search.",
            inputSchema: {
              query: { type: "string", optional: true, description: "Search keyword" },
              category: { type: "string", optional: true, description: "Filter by category" },
              max_price: { type: "number", optional: true, description: "Maximum price" },
              min_price: { type: "number", optional: true, description: "Minimum price" },
            },
          },
          {
            name: "ucp_product_details",
            title: "Get Product Details (UCP)",
            description:
              "Get full details for a specific product by ID. Equivalent to UCP GET /ucp/v1/catalog/products/:id.",
            inputSchema: {
              product_id: { type: "string", required: true, description: "The product ID" },
            },
          },
          {
            name: "ucp_checkout_create",
            title: "Create Checkout Session (UCP)",
            description:
              "Create a UCP checkout session with line items. Implements the checkout state machine: under $250 goes to ready_for_complete, over $250 enters requires_escalation with CIBA approval.",
            inputSchema: {
              product_id: { type: "string", required: true, description: "Product ID to purchase" },
              quantity: { type: "number", optional: true, description: "Quantity (default: 1)" },
              buyer_email: { type: "string", optional: true, description: "Buyer email" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "ucp_checkout_status",
            title: "Get Checkout Status (UCP)",
            description:
              "Poll the current state of a UCP checkout session. Equivalent to UCP GET /ucp/v1/checkout/sessions/:id.",
            inputSchema: {
              session_id: { type: "string", required: true, description: "The checkout session ID" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "ucp_checkout_complete",
            title: "Complete Checkout (UCP)",
            description:
              "Complete a UCP checkout session. For escalated sessions, requires an escalation_token from buyer approval via Auth0 CIBA.",
            inputSchema: {
              session_id: { type: "string", required: true, description: "The checkout session ID" },
              escalation_token: { type: "string", optional: true, description: "CIBA approval token (required if escalated)" },
            },
            requiredScope: "execute:purchase",
          },
          {
            name: "ucp_get_orders",
            title: "Get Orders (UCP)",
            description:
              "Retrieve the authenticated user's orders. Equivalent to UCP GET /ucp/v1/orders.",
            inputSchema: {},
            requiredScope: "read:orders",
          },
        ],
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
