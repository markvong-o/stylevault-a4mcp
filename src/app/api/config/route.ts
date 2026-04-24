import { NextResponse } from "next/server";
import { getActiveSessions } from "@/app/mcp/route";
import { getActiveGeminiSessions } from "@/app/gemini-mcp/route";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "your-tenant.us.auth0.com";
const AUTH0_MCP_AUDIENCE = process.env.AUTH0_MCP_AUDIENCE || "https://app.stylevault.mvbuilt.com/mcp";
const AUTH0_RESOURCE_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://api.stylevault.com";

export function GET() {
  const mcp = getActiveSessions();
  const gemini = getActiveGeminiSessions();
  const sessions = { active: mcp.active + gemini.active, ids: [...mcp.ids, ...gemini.ids] };

  return NextResponse.json({
    server: {
      name: "RetailZero",
      version: "1.0.0",
      protocolVersion: "2025-03-26",
    },
    auth: {
      domain: AUTH0_DOMAIN,
      mcpApi: {
        audience: AUTH0_MCP_AUDIENCE,
        description: "MCP Tools API -- agent authenticates against this audience",
        scopes: [
          { name: "tool:get_wishlist", description: "View the user's saved wishlist" },
          { name: "tool:add_to_wishlist", description: "Add products to the wishlist" },
          { name: "tool:remove_from_wishlist", description: "Remove products from the wishlist" },
          { name: "tool:get_recommendations", description: "Get personalized product recommendations" },
          { name: "tool:get_order_history", description: "View order history" },
          { name: "tool:place_order", description: "Place orders on behalf of user" },
          { name: "tool:update_preferences", description: "Update style preferences" },
        ],
      },
      resourceApi: {
        audience: AUTH0_RESOURCE_AUDIENCE,
        description: "Resource API -- OBO exchange targets this audience",
        scopes: [
          { name: "read:wishlist", description: "Read the user's saved wishlist" },
          { name: "write:wishlist", description: "Modify the user's wishlist" },
          { name: "read:orders", description: "View order history and status" },
          { name: "write:preferences", description: "Update style preferences" },
          { name: "execute:purchase", description: "Place orders on behalf of user" },
        ],
      },
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
          { name: "search_products", title: "Search Products", description: "Search the RetailZero catalog by keyword, category, or price range.", inputSchema: { query: { type: "string", optional: true }, category: { type: "string", optional: true }, max_price: { type: "number", optional: true }, min_price: { type: "number", optional: true } } },
          { name: "get_product_details", title: "Get Product Details", description: "Get full details for a specific product by ID.", inputSchema: { product_id: { type: "string", required: true } } },
          { name: "get_wishlist", title: "Get Wishlist", description: "Retrieve the authenticated user's saved wishlist items.", inputSchema: {}, toolScope: "tool:get_wishlist", resourceScope: "read:wishlist" },
          { name: "add_to_wishlist", title: "Add to Wishlist", description: "Add a product to the user's wishlist.", inputSchema: { product_id: { type: "string", required: true } }, toolScope: "tool:add_to_wishlist", resourceScope: "write:wishlist" },
          { name: "remove_from_wishlist", title: "Remove from Wishlist", description: "Remove a product from the user's wishlist.", inputSchema: { product_id: { type: "string", required: true } }, toolScope: "tool:remove_from_wishlist", resourceScope: "write:wishlist" },
          { name: "get_recommendations", title: "Get Recommendations", description: "Personalized suggestions based on wishlist and purchase history.", inputSchema: { limit: { type: "number", required: false } }, toolScope: "tool:get_recommendations", resourceScopes: ["read:wishlist", "read:orders"] },
          { name: "get_order_history", title: "Get Order History", description: "Retrieve the authenticated user's past orders.", inputSchema: {}, toolScope: "tool:get_order_history", resourceScope: "read:orders" },
          { name: "place_order", title: "Place Order", description: "Place an order for a product. Enforces a $250 per-transaction limit.", inputSchema: { product_id: { type: "string", required: true }, quantity: { type: "number", required: false } }, toolScope: "tool:place_order", resourceScope: "execute:purchase" },
          { name: "update_preferences", title: "Update Preferences", description: "Add style preferences to the user's profile.", inputSchema: { add: { type: "string[]", required: true } }, toolScope: "tool:update_preferences", resourceScope: "write:preferences" },
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
          { name: "/.well-known/ucp", title: "UCP Manifest Discovery", description: "Public manifest advertising merchant capabilities.", inputSchema: {} },
          { name: "GET /ucp/v1/catalog/search", title: "Catalog Search", description: "Search the product catalog.", inputSchema: { q: { type: "string", optional: true }, category: { type: "string", optional: true }, max_price: { type: "number", optional: true }, min_price: { type: "number", optional: true } } },
          { name: "GET /ucp/v1/catalog/products/:id", title: "Get Product Details", description: "Retrieve full details for a specific product.", inputSchema: { id: { type: "string", required: true } } },
          { name: "POST /ucp/v1/checkout/sessions", title: "Create Checkout Session", description: "Create a UCP checkout session with bounded authority enforcement ($250 cap).", inputSchema: { line_items: { type: "array", required: true }, buyer_email: { type: "string", optional: true } }, toolScope: "tool:place_order", resourceScope: "execute:purchase" },
          { name: "GET /ucp/v1/checkout/sessions/:id", title: "Get Checkout Status", description: "Poll the current state of a checkout session.", inputSchema: { id: { type: "string", required: true } } },
          { name: "POST /ucp/v1/checkout/sessions/:id/complete", title: "Complete Checkout", description: "Complete a checkout session.", inputSchema: { id: { type: "string", required: true }, escalation_token: { type: "string", optional: true } }, toolScope: "tool:place_order", resourceScope: "execute:purchase" },
          { name: "POST /ucp/v1/checkout/sessions/:id/cancel", title: "Cancel Checkout", description: "Cancel an in-progress checkout session.", inputSchema: { id: { type: "string", required: true } } },
          { name: "GET /ucp/v1/orders", title: "List Orders", description: "Retrieve the authenticated user's order history.", inputSchema: {}, toolScope: "tool:get_order_history", resourceScope: "read:orders" },
          { name: "GET /ucp/v1/orders/:id", title: "Get Order Details", description: "Retrieve a specific order by ID.", inputSchema: { id: { type: "string", required: true } }, toolScope: "tool:get_order_history", resourceScope: "read:orders" },
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
          { name: "ucp_discover", title: "Discover UCP Capabilities", description: "Returns the merchant's UCP manifest.", inputSchema: {} },
          { name: "ucp_catalog_search", title: "Search Catalog (UCP)", description: "Search the product catalog.", inputSchema: { query: { type: "string", optional: true }, category: { type: "string", optional: true }, max_price: { type: "number", optional: true }, min_price: { type: "number", optional: true } } },
          { name: "ucp_product_details", title: "Get Product Details (UCP)", description: "Get full details for a specific product.", inputSchema: { product_id: { type: "string", required: true } } },
          { name: "ucp_checkout_create", title: "Create Checkout Session (UCP)", description: "Create a UCP checkout session.", inputSchema: { product_id: { type: "string", required: true }, quantity: { type: "number", optional: true }, buyer_email: { type: "string", optional: true } }, toolScope: "tool:place_order", resourceScope: "execute:purchase" },
          { name: "ucp_checkout_status", title: "Get Checkout Status (UCP)", description: "Poll checkout session state.", inputSchema: { session_id: { type: "string", required: true } } },
          { name: "ucp_checkout_complete", title: "Complete Checkout (UCP)", description: "Complete a UCP checkout session.", inputSchema: { session_id: { type: "string", required: true }, escalation_token: { type: "string", optional: true } }, toolScope: "tool:place_order", resourceScope: "execute:purchase" },
          { name: "ucp_get_orders", title: "Get Orders (UCP)", description: "Retrieve the authenticated user's orders.", inputSchema: {}, toolScope: "tool:get_order_history", resourceScope: "read:orders" },
        ],
      },
    ],
    sessions,
    boundedAuthority: {
      maxAgentPurchase: 250,
      currency: "USD",
      description: "Agent transactions exceeding this limit are rejected. The purchase requires direct buyer approval via escalation.",
    },
  });
}
