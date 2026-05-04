import { NextResponse } from "next/server";
import { eventBus } from "@/lib/server/event-bus";
import { verifyToken, extractBearerToken } from "@/lib/server/mcp/auth";
import { scopeContext, type EventScope } from "@/lib/server/scope-context";

/**
 * Resolve the event scope for an /api/events request.
 *
 *  - Valid Bearer token            -> { user, sub }
 *  - No/invalid token + X-Demo-Session present -> { demo, sid }
 *  - Neither                       -> null (caller returns 401)
 */
async function resolveScope(req: Request): Promise<EventScope | null> {
  const token = extractBearerToken(req.headers.get("authorization") || undefined);
  if (token) {
    try {
      const info = await verifyToken(token);
      return { type: "user", sub: info.sub };
    } catch {
      // fall through to demo-session fallback
    }
  }

  const demoSid = req.headers.get("x-demo-session") || undefined;
  if (demoSid) return { type: "demo", sid: demoSid };

  return null;
}

function unauthorized(): Response {
  return NextResponse.json({ error: "authentication required" }, { status: 401 });
}

export async function GET(request: Request) {
  const scope = await resolveScope(request);
  if (!scope) return unauthorized();

  const events = await eventBus.getHistory(scope);
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const scope = await resolveScope(request);
  if (!scope) return unauthorized();

  try {
    const evt = await request.json();
    scopeContext.run(scope, () => eventBus.push(evt));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const scope = await resolveScope(request);
  if (!scope) return unauthorized();

  await eventBus.clear(scope);
  return NextResponse.json({ cleared: true });
}
