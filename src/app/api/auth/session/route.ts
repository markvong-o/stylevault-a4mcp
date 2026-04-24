import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth-session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ isAuthenticated: false });
  }

  return NextResponse.json({
    isAuthenticated: true,
    user: session.user,
    accessToken: session.accessToken,
    idToken: session.idToken,
  });
}
