import { type NextRequest, NextResponse } from "next/server";
import {
  getPkceState,
  setSession,
  sessionCookieOptions,
  clearPkceCookie,
} from "@/lib/server/auth-session";

const AUTH0_DOMAIN = process.env.AUTH0_LOGIN_DOMAIN || process.env.AUTH0_DOMAIN || "";
const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Handle Auth0 errors
    if (error) {
      return NextResponse.redirect(
        `${BASE_URL}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(`${BASE_URL}/?error=missing_code`);
    }

    // Pre-flight checks for required env vars
    if (!AUTH0_DOMAIN) {
      console.error("[oauth/callback] AUTH0_LOGIN_DOMAIN / AUTH0_DOMAIN not set");
      return NextResponse.redirect(`${BASE_URL}/?error=server_misconfigured&error_description=${encodeURIComponent("AUTH0_DOMAIN not configured")}`);
    }

    if (!process.env.AUTH0_SESSION_SECRET) {
      console.error("[oauth/callback] AUTH0_SESSION_SECRET not set");
      return NextResponse.redirect(`${BASE_URL}/?error=server_misconfigured&error_description=${encodeURIComponent("Session secret not configured")}`);
    }

    // Validate state and retrieve PKCE code_verifier
    const pkceState = await getPkceState();
    if (!pkceState) {
      console.error("[oauth/callback] PKCE cookie missing or unreadable");
      return NextResponse.redirect(`${BASE_URL}/?error=pkce_missing&error_description=${encodeURIComponent("PKCE cookie not found. Try logging in again.")}`);
    }
    if (pkceState.state !== state) {
      console.error("[oauth/callback] State mismatch:", { expected: pkceState.state, got: state });
      return NextResponse.redirect(`${BASE_URL}/?error=invalid_state`);
    }

    // Exchange authorization code for tokens
    const clientId = `${BASE_URL}/client-metadata.json`;
    const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;

    console.log("[oauth/callback] Exchanging code at:", tokenUrl, "client_id:", clientId);

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: `${BASE_URL}/oauth/callback`,
        code_verifier: pkceState.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("[oauth/callback] Token exchange failed:", tokenResponse.status, err);
      return NextResponse.redirect(
        `${BASE_URL}/?error=token_exchange_failed&error_description=${encodeURIComponent(err.slice(0, 200))}`
      );
    }

    const tokens = await tokenResponse.json();
    console.log("[oauth/callback] Token response keys:", Object.keys(tokens));

    const { access_token, id_token, refresh_token } = tokens;

    // Build user profile by decoding the access token JWT. The token is
    // issued for the MCP Tools API audience and contains user claims.
    const { decodeJwt } = await import("jose");
    const claims = decodeJwt(access_token);
    console.log("[oauth/callback] User profile from access_token:", claims.sub);
    const user = {
      sub: (claims.sub as string) || "",
      name: (claims.name as string | undefined) || (claims.nickname as string | undefined),
      email: claims.email as string | undefined,
      picture: claims.picture as string | undefined,
    };

    const sessionJwe = await setSession({
      accessToken: access_token,
      idToken: id_token || "",
      refreshToken: refresh_token,
      user,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    });

    const response = NextResponse.redirect(`${BASE_URL}/profile`);
    response.cookies.set(sessionCookieOptions(sessionJwe));
    response.cookies.set(clearPkceCookie());
    return response;
  } catch (err) {
    console.error("[oauth/callback] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${BASE_URL}/?error=callback_error&error_description=${encodeURIComponent(message.slice(0, 200))}`
    );
  }
}
