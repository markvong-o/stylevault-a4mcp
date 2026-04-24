import { eventBus } from "./event-bus";

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

export function getOrder(id: string) {
  return orders.get(id) ?? null;
}

export function listOrders(buyerEmail?: string) {
  let results = Array.from(orders.values());

  if (buyerEmail) {
    results = results.filter((o) => o.buyer_email === buyerEmail);
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

  return { orders: results, total: results.length };
}

export function createOrder(
  orderId: string,
  items: { name: string; price: number; quantity: number }[],
  total: number,
  buyerEmail: string
): Order {
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
