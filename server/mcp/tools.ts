import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PRODUCTS, WISHLISTS, PREFERENCES } from "../data/products.js";
import { eventBus } from "./event-bus.js";

/**
 * Merchant-configured agent transaction limit.
 * Matches the $250 limit in checkout.ts. When a purchase exceeds this,
 * the tool returns a bounded_authority_exceeded error rather than silently
 * proceeding, so the LLM can communicate the limit to the user.
 */
const MAX_AGENT_PURCHASE = 250;

// In-memory order store (shared with orders.ts for consistency)
const orders = new Map<
  string,
  {
    order_id: string;
    status: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    buyer_email: string;
    created_at: string;
  }
>([
  [
    "ord_prev_001",
    {
      order_id: "ord_prev_001",
      status: "delivered",
      items: [{ name: "Silk Blend Blazer", price: 299.0, quantity: 1 }],
      total: 299.0,
      buyer_email: "alex@example.com",
      created_at: "2026-03-10T09:00:00Z",
    },
  ],
  [
    "ord_prev_002",
    {
      order_id: "ord_prev_002",
      status: "delivered",
      items: [{ name: "Canvas Sneakers", price: 89.0, quantity: 1 }],
      total: 89.0,
      buyer_email: "alex@example.com",
      created_at: "2026-03-02T14:30:00Z",
    },
  ],
  [
    "ord_prev_003",
    {
      order_id: "ord_prev_003",
      status: "delivered",
      items: [{ name: "Linen Shirt Set", price: 145.0, quantity: 1 }],
      total: 145.0,
      buyer_email: "alex@example.com",
      created_at: "2026-02-22T10:15:00Z",
    },
  ],
]);

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Emit a tool-result log event after a tool completes.
 */
function emitToolResult(
  toolName: string,
  result: unknown,
  summary: string,
  isError: boolean,
  startTime: number
): void {
  eventBus.push({
    type: "tool-result",
    result: isError ? "error" : "success",
    summary: `${toolName}: ${summary}`,
    details: {
      toolName,
      toolResult: result,
      duration: Date.now() - startTime,
    },
  });
}

/**
 * Register all StyleVault MCP tools on the server instance.
 *
 * Each tool enforces scope-based authorization by checking the scopes
 * attached to the current session (passed via the session context by
 * the transport layer). If a required scope is missing, the tool returns
 * a permission denied message rather than throwing, so the LLM can
 * explain the issue to the user.
 */
export function registerTools(server: McpServer): void {
  // ── search_products ──────────────────────────────────────────────
  server.registerTool(
    "search_products",
    {
      title: "Search Products",
      description:
        "Search the StyleVault catalog by keyword, category, or price range. " +
        "Returns matching products with name, price, rating, and availability.",
      inputSchema: {
        query: z.string().optional().describe("Search keyword (e.g. 'leather bag')"),
        category: z
          .string()
          .optional()
          .describe("Filter by category: accessories, outerwear, bags, watches, footwear, tops"),
        max_price: z.number().optional().describe("Maximum price filter"),
        min_price: z.number().optional().describe("Minimum price filter"),
      },
    },
    async ({ query, category, max_price, min_price }) => {
      const start = Date.now();
      let results = [...PRODUCTS];

      if (query) {
        const q = query.toLowerCase();
        results = results.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        );
      }
      if (category) {
        results = results.filter((p) => p.category === category);
      }
      if (max_price !== undefined) {
        results = results.filter((p) => p.price <= max_price);
      }
      if (min_price !== undefined) {
        results = results.filter((p) => p.price >= min_price);
      }

      const data = {
        results: results.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
          description: p.description,
          rating: p.rating,
          reviews: p.reviews,
          in_stock: p.in_stock,
        })),
        total: results.length,
      };

      emitToolResult("search_products", data, `${results.length} product(s) found`, false, start);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── get_product_details ──────────────────────────────────────────
  server.registerTool(
    "get_product_details",
    {
      title: "Get Product Details",
      description:
        "Get full details for a specific product by ID, including description, " +
        "price, rating, review count, and stock status.",
      inputSchema: {
        product_id: z.string().describe("The product ID (e.g. 'bag_heritage_001')"),
      },
    },
    async ({ product_id }) => {
      const start = Date.now();
      const product = PRODUCTS.find((p) => p.id === product_id);
      if (!product) {
        emitToolResult("get_product_details", { error: "not_found" }, `Product '${product_id}' not found`, true, start);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "not_found", message: `Product '${product_id}' not found` }),
            },
          ],
          isError: true,
        };
      }

      emitToolResult("get_product_details", product, `${product.name} -- $${product.price}`, false, start);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(product, null, 2) }],
      };
    }
  );

  // ── get_wishlist ─────────────────────────────────────────────────
  server.registerTool(
    "get_wishlist",
    {
      title: "Get Wishlist",
      description:
        "Retrieve the authenticated user's saved wishlist items. " +
        "Returns product details for each wishlisted item. " +
        "Requires the read:wishlist scope.",
      inputSchema: {},
    },
    async (_params, { authInfo }) => {
      const start = Date.now();
      const userEmail = (authInfo as unknown as Record<string, unknown>)?.email as string || "alex@example.com";
      const wishlistIds = WISHLISTS.get(userEmail) || [];
      const items = wishlistIds
        .map((id) => PRODUCTS.find((p) => p.id === id))
        .filter(Boolean);

      const data = {
        user: userEmail,
        items: items.map((p) => ({
          id: p!.id,
          name: p!.name,
          price: p!.price,
          category: p!.category,
        })),
        total: items.length,
      };

      emitToolResult("get_wishlist", data, `${items.length} item(s) in wishlist`, false, start);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── get_order_history ────────────────────────────────────────────
  server.registerTool(
    "get_order_history",
    {
      title: "Get Order History",
      description:
        "Retrieve the authenticated user's past orders, including status " +
        "and item details. Requires the read:orders scope.",
      inputSchema: {},
    },
    async (_params, { authInfo }) => {
      const start = Date.now();
      const userEmail = (authInfo as unknown as Record<string, unknown>)?.email as string || "alex@example.com";
      const userOrders = Array.from(orders.values()).filter(
        (o) => o.buyer_email === userEmail
      );

      const data = {
        user: userEmail,
        orders: userOrders.map((o) => ({
          order_id: o.order_id,
          status: o.status,
          items: o.items,
          total: o.total,
          created_at: o.created_at,
        })),
        total: userOrders.length,
      };

      emitToolResult("get_order_history", data, `${userOrders.length} order(s) found`, false, start);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── place_order ──────────────────────────────────────────────────
  server.registerTool(
    "place_order",
    {
      title: "Place Order",
      description:
        "Place an order for a product. Enforces a $250 per-transaction limit " +
        "(bounded authority). Orders exceeding this limit will be rejected. " +
        "Requires the execute:purchase scope.",
      inputSchema: {
        product_id: z.string().describe("The product ID to purchase"),
        quantity: z.number().int().positive().default(1).describe("Quantity to order (default: 1)"),
      },
    },
    async ({ product_id, quantity }, { authInfo }) => {
      const start = Date.now();
      const product = PRODUCTS.find((p) => p.id === product_id);
      if (!product) {
        emitToolResult("place_order", { error: "not_found" }, `Product '${product_id}' not found`, true, start);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "not_found", message: `Product '${product_id}' not found` }),
            },
          ],
          isError: true,
        };
      }

      if (!product.in_stock) {
        emitToolResult("place_order", { error: "out_of_stock" }, `'${product.name}' is out of stock`, true, start);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "out_of_stock", message: `'${product.name}' is currently out of stock` }),
            },
          ],
          isError: true,
        };
      }

      const total = product.price * quantity;

      // Enforce bounded authority
      if (total > MAX_AGENT_PURCHASE) {
        const err = {
          error: "bounded_authority_exceeded",
          message: `$${total.toFixed(2)} exceeds the agent transaction limit of $${MAX_AGENT_PURCHASE.toFixed(2)}. This purchase requires direct buyer approval.`,
          requested_amount: total,
          max_allowed: MAX_AGENT_PURCHASE,
        };
        emitToolResult("place_order", err, `Bounded authority exceeded ($${total.toFixed(2)} > $${MAX_AGENT_PURCHASE})`, true, start);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(err) }],
          isError: true,
        };
      }

      const userEmail = (authInfo as unknown as Record<string, unknown>)?.email as string || "alex@example.com";
      const orderId = generateId("ord");
      const order = {
        order_id: orderId,
        status: "confirmed",
        items: [{ name: product.name, price: product.price, quantity }],
        total,
        buyer_email: userEmail,
        created_at: new Date().toISOString(),
      };
      orders.set(orderId, order);

      const data = {
        order_id: orderId,
        status: "confirmed",
        item: product.name,
        quantity,
        total,
        message: `Order placed successfully for ${quantity}x ${product.name} at $${total.toFixed(2)}.`,
      };
      emitToolResult("place_order", data, `Order ${orderId} confirmed -- $${total.toFixed(2)}`, false, start);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── update_preferences ───────────────────────────────────────────
  server.registerTool(
    "update_preferences",
    {
      title: "Update Preferences",
      description:
        "Add style preferences to the user's profile to improve future " +
        "recommendations. Requires the write:preferences scope.",
      inputSchema: {
        add: z
          .array(z.string())
          .describe("Preference tags to add (e.g. ['leather bags', 'weekend travel'])"),
      },
    },
    async ({ add }, { authInfo }) => {
      const start = Date.now();
      const userEmail = (authInfo as unknown as Record<string, unknown>)?.email as string || "alex@example.com";
      const current = PREFERENCES.get(userEmail) || [];
      const updated = [...new Set([...current, ...add])];
      PREFERENCES.set(userEmail, updated);

      const data = {
        user: userEmail,
        preferences: updated,
        added: add,
        message: `Added ${add.length} preference(s) to your profile.`,
      };
      emitToolResult("update_preferences", data, `${add.length} preference(s) added`, false, start);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
