import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateCartItem, removeFromCart } from "@/lib/server/cart";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

const PatchSchema = z.object({
  quantity: z.number().int().min(0),
});

function getUserEmail(req: NextRequest): string {
  return req.headers.get("x-user-email") || "alex@example.com";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ product_id: string }> }
) {
  authenticateUcpRequest(request);
  const userEmail = getUserEmail(request);
  const { product_id } = await context.params;

  const body = await request.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const result = updateCartItem(userEmail, product_id, parsed.data.quantity);
  if ("error" in result) {
    const status = result.error === "not_in_cart" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({
    user: userEmail,
    items: result.items,
    total: result.total,
    item_count: result.items.reduce((s, i) => s + i.quantity, 0),
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ product_id: string }> }
) {
  authenticateUcpRequest(request);
  const userEmail = getUserEmail(request);
  const { product_id } = await context.params;

  const result = removeFromCart(userEmail, product_id);
  if ("error" in result) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json({
    user: userEmail,
    items: result.items,
    total: result.total,
    item_count: result.items.reduce((s, i) => s + i.quantity, 0),
  });
}
