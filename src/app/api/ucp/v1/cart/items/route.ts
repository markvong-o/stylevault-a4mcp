import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addToCart } from "@/lib/server/cart";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

const BodySchema = z.object({
  product_id: z.string(),
  quantity: z.number().int().positive().default(1),
});

function getUserEmail(req: NextRequest): string {
  return req.headers.get("x-user-email") || "alex@example.com";
}

export async function POST(request: NextRequest) {
  authenticateUcpRequest(request);
  const userEmail = getUserEmail(request);

  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const result = addToCart(userEmail, parsed.data.product_id, parsed.data.quantity);
  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(
    {
      user: userEmail,
      items: result.items,
      total: result.total,
      item_count: result.items.reduce((s, i) => s + i.quantity, 0),
    },
    { status: 200 }
  );
}
