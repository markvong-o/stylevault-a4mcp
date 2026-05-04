import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/auth-session";

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function GET() {
  // CIMD / third-party clients cannot call Auth0's /v2/logout endpoint
  // ("Federated clients cannot access non-authority tenants").
  // Instead, clear the local session cookie and redirect to the dashboard.
  const response = NextResponse.redirect(`${BASE_URL}/dashboard`);
  response.cookies.set(clearSessionCookie());
  return response;
}
