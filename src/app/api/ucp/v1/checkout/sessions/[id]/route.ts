import { type NextRequest, NextResponse } from "next/server";
import { getCheckoutSession } from "@/lib/server/checkout";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  authenticateUcpRequest(request);
  const { id } = await params;
  const session = getCheckoutSession(id);
  if (!session) {
    return NextResponse.json({ error: "not_found", error_description: "Checkout session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}
