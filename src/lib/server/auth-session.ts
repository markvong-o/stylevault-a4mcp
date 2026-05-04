import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

const SESSION_COOKIE = "sv_session";
const PKCE_COOKIE = "sv_pkce";

function getEncryptionKey(): Uint8Array {
  const secret = process.env.AUTH0_SESSION_SECRET;
  if (!secret) throw new Error("AUTH0_SESSION_SECRET is required");
  // Derive a 256-bit key from the secret
  const encoder = new TextEncoder();
  const raw = encoder.encode(secret);
  // Pad or truncate to 32 bytes
  const key = new Uint8Array(32);
  key.set(raw.slice(0, 32));
  return key;
}

export interface SessionData {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  user: {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  expiresAt: number;
}

export async function setSession(data: SessionData): Promise<string> {
  const key = getEncryptionKey();
  const jwt = await new EncryptJWT({ ...data } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .encrypt(key);
  return jwt;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const key = getEncryptionKey();
    const { payload } = await jwtDecrypt(cookie.value, key);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(value: string) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 86400, // 24 hours
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

// PKCE state helpers
export interface PkceState {
  codeVerifier: string;
  state: string;
  returnTo?: string;
}

export async function setPkceState(data: PkceState): Promise<string> {
  const key = getEncryptionKey();
  const jwt = await new EncryptJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .encrypt(key);
  return jwt;
}

export async function getPkceState(): Promise<PkceState | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(PKCE_COOKIE);
  if (!cookie?.value) return null;

  try {
    const key = getEncryptionKey();
    const { payload } = await jwtDecrypt(cookie.value, key);
    return payload as unknown as PkceState;
  } catch {
    return null;
  }
}

export function pkceCookieOptions(value: string) {
  return {
    name: PKCE_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };
}

export function clearPkceCookie() {
  return {
    name: PKCE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const PKCE_COOKIE_NAME = PKCE_COOKIE;
