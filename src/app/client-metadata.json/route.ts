import { NextResponse } from "next/server";

/**
 * Client ID Metadata Document (CIMD)
 * draft-ietf-oauth-client-id-metadata-document-01
 *
 * Serves the OAuth client metadata at /client-metadata.json.
 * Auth0 fetches this URL to discover client metadata at runtime
 * instead of requiring pre-registration via DCR.
 *
 * This Next.js route handler ensures it works on both Vercel (serverless)
 * and the custom Node server (where Hono handles it).
 */

const BASE_URL =
  process.env.APP_BASE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : `http://localhost:${process.env.PORT ?? "3000"}`);

export function GET() {
  const clientId = `${BASE_URL}/client-metadata.json`;

  const metadata = {
    // REQUIRED: must match this document's URL exactly
    client_id: clientId,

    // Persisted by Auth0
    client_name: "RetailZero AI Shopping Assistant",
    grant_types: ["authorization_code", "refresh_token"],
    redirect_uris: [`${BASE_URL}/oauth/callback`],
    token_endpoint_auth_method: "none",
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "max-age=3600",
    },
  });
}
