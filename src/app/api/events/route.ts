import { NextResponse } from "next/server";
import { eventBus } from "@/lib/server/event-bus";

export async function GET() {
  const events = await eventBus.getHistory();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  try {
    const evt = await request.json();
    eventBus.push(evt);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
}

export async function DELETE() {
  await eventBus.clear();
  return NextResponse.json({ cleared: true });
}
