import { z } from "zod";
import { PRODUCTS } from "./products";
import { eventBus } from "./event-bus";

type CheckoutStatus =
  | "incomplete"
  | "requires_escalation"
  | "ready_for_complete"
  | "complete_in_progress"
  | "completed"
  | "canceled";

export interface CheckoutSession {
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

export const CreateSessionSchema = z.object({
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

export function createCheckoutSession(body: unknown) {
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return { error: true as const, status: 400, data: { error: "invalid_request", error_description: parsed.error.message } };
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

  eventBus.push({
    type: "tool-call",
    result: status === "requires_escalation" ? "info" : "success",
    summary: `UCP checkout created: ${sessionId} -- $${total.toFixed(2)} (${status})`,
    details: {
      method: "POST",
      path: "/ucp/v1/checkout/sessions",
      toolName: "ucp_create_checkout",
      toolArgs: { line_items, buyer },
      toolResult: { session_id: sessionId, status, total },
    },
  });

  return { error: false as const, status: 201, data: session };
}

export function getCheckoutSession(id: string) {
  return sessions.get(id) ?? null;
}

export function completeCheckoutSession(id: string, escalationToken?: string) {
  const session = sessions.get(id);
  if (!session) {
    return { error: true as const, status: 404, data: { error: "not_found", error_description: "Checkout session not found" } };
  }

  if (session.status !== "ready_for_complete" && session.status !== "requires_escalation") {
    return {
      error: true as const,
      status: 409,
      data: {
        error: "invalid_state",
        error_description: `Cannot complete session in "${session.status}" state`,
        messages: [{ severity: "unrecoverable", text: `Session must be in ready_for_complete state. Current: ${session.status}` }],
      },
    };
  }

  if (session.status === "requires_escalation") {
    if (!escalationToken) {
      return {
        error: true as const,
        status: 403,
        data: {
          error: "escalation_required",
          error_description: "Buyer approval required. Provide X-UCP-Escalation-Token header.",
          continue_url: session.continue_url,
          messages: [{ severity: "requires_buyer_input", text: "Buyer must approve this transaction." }],
        },
      };
    }
  }

  session.status = "completed";
  session.order_id = generateId("ucp_ord");
  session.updated_at = new Date().toISOString();

  eventBus.push({
    type: "tool-result",
    result: "success",
    summary: `UCP checkout completed: ${session.session_id} -- order ${session.order_id}`,
    details: {
      method: "POST",
      path: `/ucp/v1/checkout/sessions/${id}/complete`,
      toolName: "ucp_complete_checkout",
      toolResult: { session_id: session.session_id, status: session.status, order_id: session.order_id },
    },
  });

  return { error: false as const, status: 200, data: session };
}

export function cancelCheckoutSession(id: string) {
  const session = sessions.get(id);
  if (!session) {
    return { error: true as const, status: 404, data: { error: "not_found", error_description: "Checkout session not found" } };
  }

  if (session.status === "completed") {
    return { error: true as const, status: 409, data: { error: "invalid_state", error_description: "Cannot cancel a completed session" } };
  }

  session.status = "canceled";
  session.updated_at = new Date().toISOString();
  return { error: false as const, status: 200, data: session };
}
