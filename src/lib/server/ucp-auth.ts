import { NextRequest } from "next/server";

/**
 * UCP request authentication.
 *
 * UCP uses two auth layers:
 * 1. HTTP Message Signatures (RFC 9421) - agent signs requests with its private key
 * 2. OAuth 2.0 Bearer Token - for Identity Linking operations
 *
 * For this demo, we accept any request and log the headers.
 * In production, validate signatures and JWTs.
 */
export function authenticateUcpRequest(req: NextRequest): { ok: boolean; log: string } {
  const authHeader = req.headers.get("Authorization");
  const ucpAgent = req.headers.get("UCP-Agent");
  const requestSignature = req.headers.get("request-signature");
  const idempotencyKey = req.headers.get("idempotency-key");
  const requestId = req.headers.get("request-id");

  if (ucpAgent || requestSignature || idempotencyKey) {
    console.log("[Auth] UCP headers:", {
      "UCP-Agent": ucpAgent ?? "(none)",
      "request-signature": requestSignature ? "(present)" : "(none)",
      "idempotency-key": idempotencyKey ?? "(none)",
      "request-id": requestId ?? "(none)",
    });
  }

  if (!ucpAgent && !authHeader) {
    console.log("[Auth] No UCP-Agent or Authorization header - proceeding in demo mode");
  } else {
    console.log("[Auth] Request authenticated - proceeding");
  }

  return { ok: true, log: "authenticated" };
}
