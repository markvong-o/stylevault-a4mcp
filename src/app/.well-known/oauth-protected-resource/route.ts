import { NextResponse } from "next/server";
import { eventBus } from "@/lib/server/event-bus";
import { protectedResourceMetadata } from "@/lib/server/mcp/resource-metadata";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

export async function GET(request: Request) {
  const metadata = protectedResourceMetadata(request);

  eventBus.push({
    type: "metadata-fetch",
    result: "info",
    summary: "Protected Resource Metadata requested (RFC 9728)",
    details: {
      method: "GET",
      path: new URL(request.url).pathname,
      headers: { "user-agent": request.headers.get("user-agent") || "unknown" },
      responseBody: metadata,
    },
  });

  return NextResponse.json(metadata, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
