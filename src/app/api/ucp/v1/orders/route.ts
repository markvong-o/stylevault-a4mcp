import { type NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/lib/server/orders";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function GET(request: NextRequest) {
  authenticateUcpRequest(request);
  const email = request.nextUrl.searchParams.get("buyer_email") ?? undefined;
  return NextResponse.json(listOrders(email));
}
