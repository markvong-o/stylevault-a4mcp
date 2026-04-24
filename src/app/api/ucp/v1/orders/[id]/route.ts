import { type NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/server/orders";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  authenticateUcpRequest(request);
  const { id } = await params;
  const order = getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "not_found", error_description: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}
