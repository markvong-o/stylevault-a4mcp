import { NextResponse } from "next/server";
import { getActiveSessions } from "@/app/mcp/route";
import { getActiveGeminiSessions } from "@/app/gemini-mcp/route";

/**
 * Aggregate active MCP session counts across the two transports.
 * Not scope-gated: session counts are global infrastructure metrics,
 * not per-user event data.
 */
export async function GET() {
  const mcp = getActiveSessions();
  const gemini = getActiveGeminiSessions();
  return NextResponse.json({
    mcp: { active: mcp.active, ids: mcp.ids },
    gemini: { active: gemini.active, ids: gemini.ids },
    total: mcp.active + gemini.active,
  });
}
