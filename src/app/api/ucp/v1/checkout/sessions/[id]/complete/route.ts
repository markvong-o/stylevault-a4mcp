import { type NextRequest, NextResponse } from "next/server";
import { completeCheckoutSession } from "@/lib/server/checkout";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  authenticateUcpRequest(request);
  const { id } = await params;
  const escalationToken = request.headers.get("X-UCP-Escalation-Token") ?? undefined;
  const result = completeCheckoutSession(id, escalationToken);
  return NextResponse.json(result.data, { status: result.status });
}
