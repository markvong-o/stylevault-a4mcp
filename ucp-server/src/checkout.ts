import { Hono } from "hono";
import { z } from "zod";
import { PRODUCTS } from "./data/products.js";

type CheckoutStatus =
  | "incomplete"
  | "requires_escalation"
  | "ready_for_complete"
  | "complete_in_progress"
  | "completed"
  | "canceled";

interface CheckoutSession {
  session_id: string;
  status: CheckoutStatus;
  line_items: { product_id: string; quantity: number; name: string; price: number }[];
  total: number;
  buyer_email?: string;
  continue_url?: string;
  order_id?: string;
  messages: { severity: string; text: string }[];
  created_at: string;
  updated_at: string;
}

const sessions = new Map<string, CheckoutSession>();

const MAX_AGENT_PURCHASE = 250;

const CreateSessionSchema = z.object({
  line_items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().int().positive().default(1),
    })
  ),
  buyer: z
    .object({
      email: z.string().email().optional(),
    })
    .optional(),
});

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 7)}`;
}

const app = new Hono();

// Create checkout session
app.post("/ucp/v1/checkout/sessions", async (c) => {
  const body = await c.req.json();
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", error_description: parsed.error.message }, 400);
  }

  const { line_items, buyer } = parsed.data;

  const resolvedItems = line_items.map((item) => {
    const product = PRODUCTS.find((p) => p.id === item.product_id);
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      name: product?.name ?? "Unknown",
      price: product?.price ?? 0,
    };
  });

  const total = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sessionId = generateId("ucp_sess");
  const messages: { severity: string; text: string }[] = [];

  let status: CheckoutStatus = "incomplete";
  let continue_url: string | undefined;

  // Check bounded authority
  if (total > MAX_AGENT_PURCHASE) {
    status = "requires_escalation";
    continue_url = `https://stylevault.com/ucp/escalate/${sessionId}`;
    messages.push({
      severity: "requires_buyer_input",
      text: `Amount $${total.toFixed(2)} exceeds agent limit of $${MAX_AGENT_PURCHASE}. Buyer approval required.`,
    });
  } else {
    status = "ready_for_complete";
  }

  const now = new Date().toISOString();
  const session: CheckoutSession = {
    session_id: sessionId,
    status,
    line_items: resolvedItems,
    total,
    buyer_email: buyer?.email,
    continue_url,
    messages,
    created_at: now,
    updated_at: now,
  };

  sessions.set(sessionId, session);

  return c.json(session, 201);
});

// Get checkout session
app.get("/ucp/v1/checkout/sessions/:id", (c) => {
  const session = sessions.get(c.req.param("id"));
  if (!session) {
    return c.json({ error: "not_found", error_description: "Checkout session not found" }, 404);
  }
  return c.json(session);
});

// Complete checkout session
app.post("/ucp/v1/checkout/sessions/:id/complete", (c) => {
  const session = sessions.get(c.req.param("id"));
  if (!session) {
    return c.json({ error: "not_found", error_description: "Checkout session not found" }, 404);
  }

  if (session.status !== "ready_for_complete" && session.status !== "requires_escalation") {
    return c.json(
      {
        error: "invalid_state",
        error_description: `Cannot complete session in "${session.status}" state`,
        messages: [{ severity: "unrecoverable", text: `Session must be in ready_for_complete state. Current: ${session.status}` }],
      },
      409
    );
  }

  // If requires_escalation, check for escalation approval header
  if (session.status === "requires_escalation") {
    const escalationToken = c.req.header("X-UCP-Escalation-Token");
    if (!escalationToken) {
      return c.json(
        {
          error: "escalation_required",
          error_description: "Buyer approval required. Provide X-UCP-Escalation-Token header.",
          continue_url: session.continue_url,
          messages: [{ severity: "requires_buyer_input", text: "Buyer must approve this transaction." }],
        },
        403
      );
    }
    // In production, validate the escalation token via Auth0 CIBA
  }

  session.status = "complete_in_progress";
  session.updated_at = new Date().toISOString();

  // Simulate processing
  session.status = "completed";
  session.order_id = generateId("ucp_ord");
  session.updated_at = new Date().toISOString();

  return c.json(session);
});

// Cancel checkout session
app.post("/ucp/v1/checkout/sessions/:id/cancel", (c) => {
  const session = sessions.get(c.req.param("id"));
  if (!session) {
    return c.json({ error: "not_found", error_description: "Checkout session not found" }, 404);
  }

  if (session.status === "completed") {
    return c.json(
      { error: "invalid_state", error_description: "Cannot cancel a completed session" },
      409
    );
  }

  session.status = "canceled";
  session.updated_at = new Date().toISOString();
  return c.json(session);
});

export { app as checkoutRoutes };
