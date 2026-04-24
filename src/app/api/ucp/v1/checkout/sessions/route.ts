import { type NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/server/checkout";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function POST(request: NextRequest) {
  authenticateUcpRequest(request);
  const body = await request.json();
  const result = createCheckoutSession(body);
  return NextResponse.json(result.data, { status: result.status });
}
