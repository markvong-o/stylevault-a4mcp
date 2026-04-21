import { Hono } from "hono";
import { eventBus } from "./mcp/event-bus.js";

interface Order {
  order_id: string;
  status: "processing" | "shipped" | "delivered" | "canceled";
  items: { name: string; price: number; quantity: number }[];
  total: number;
  buyer_email: string;
  shipment?: {
    status: string;
    carrier?: string;
    tracking_number?: string;
    estimated_delivery?: string;
  };
  created_at: string;
}

// Seed some demo orders
const orders = new Map<string, Order>([
  [
    "ucp_ord_9x7m1",
    {
      order_id: "ucp_ord_9x7m1",
      status: "processing",
      items: [{ name: "Heritage Duffle", price: 269.0, quantity: 1 }],
      total: 269.0,
      buyer_email: "alex@example.com",
      shipment: {
        status: "label_created",
        carrier: "UPS",
        tracking_number: "1Z999AA10123456784",
        estimated_delivery: "2026-04-14",
      },
      created_at: "2026-04-10T11:02:12Z",
    },
  ],
  [
    "ucp_ord_prev1",
    {
      order_id: "ucp_ord_prev1",
      status: "delivered",
      items: [{ name: "Silk Blend Blazer", price: 299.0, quantity: 1 }],
      total: 299.0,
      buyer_email: "alex@example.com",
      shipment: {
        status: "delivered",
        carrier: "FedEx",
        estimated_delivery: "2026-03-15",
      },
      created_at: "2026-03-10T09:00:00Z",
    },
  ],
]);

const app = new Hono();

// Get order by ID
app.get("/ucp/v1/orders/:id", (c) => {
  const order = orders.get(c.req.param("id"));
  if (!order) {
    return c.json({ error: "not_found", error_description: "Order not found" }, 404);
  }
  return c.json(order);
});

// List orders for a buyer
app.get("/ucp/v1/orders", (c) => {
  const email = c.req.query("buyer_email");
  let results = Array.from(orders.values());

  if (email) {
    results = results.filter((o) => o.buyer_email === email);
  }

  eventBus.push({
    type: "tool-call",
    result: "success",
    summary: `UCP orders list -- ${results.length} order(s)`,
    details: {
      method: "GET",
      path: "/ucp/v1/orders",
      toolName: "ucp_get_orders",
      toolResult: { total: results.length },
    },
  });

  return c.json({
    orders: results,
    total: results.length,
  });
});

// Export for dynamic order creation from checkout completion
export function createOrder(orderId: string, items: { name: string; price: number; quantity: number }[], total: number, buyerEmail: string): Order {
  const order: Order = {
    order_id: orderId,
    status: "processing",
    items,
    total,
    buyer_email: buyerEmail,
    shipment: {
      status: "label_created",
      carrier: "UPS",
      estimated_delivery: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    },
    created_at: new Date().toISOString(),
  };
  orders.set(orderId, order);
  return order;
}

export { app as orderRoutes };
