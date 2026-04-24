import { type NextRequest, NextResponse } from "next/server";
import { cancelCheckoutSession } from "@/lib/server/checkout";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  authenticateUcpRequest(request);
  const { id } = await params;
  const result = cancelCheckoutSession(id);
  return NextResponse.json(result.data, { status: result.status });
}
