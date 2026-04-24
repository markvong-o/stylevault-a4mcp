import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "retailzero-server", mcp: true, ucp: true });
}
