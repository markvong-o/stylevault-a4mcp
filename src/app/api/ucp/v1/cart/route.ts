import { type NextRequest, NextResponse } from "next/server";
import { getCart, clearCart } from "@/lib/server/cart";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

/**
 * Cart REST surface (demo). Identity is taken from the X-User-Email
 * header, mirroring the convention used elsewhere in the UCP demo. The
 * MCP tool surface is the authoritative path for production use because
 * it enforces the full OAuth 2.0 + RFC 8693 OBO flow.
 */
function getUserEmail(req: NextRequest): string {
  return req.headers.get("x-user-email") || "alex@example.com";
}

export async function GET(request: NextRequest) {
  authenticateUcpRequest(request);
  const userEmail = getUserEmail(request);
  const cart = getCart(userEmail);
  return NextResponse.json({
    user: userEmail,
    items: cart.items,
    total: cart.total,
    item_count: cart.items.reduce((s, i) => s + i.quantity, 0),
    updated_at: cart.updated_at,
  });
}

export async function DELETE(request: NextRequest) {
  authenticateUcpRequest(request);
  const userEmail = getUserEmail(request);
  clearCart(userEmail);
  return NextResponse.json({ user: userEmail, message: "Cart cleared." });
}
