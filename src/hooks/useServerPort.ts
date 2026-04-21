"use client";

/**
 * Previously discovered the backend server port by probing localhost:3001-3010.
 * Now that the backend runs on the same port as Next.js, this always returns
 * a truthy value so consumers skip their "discovering..." loading states.
 *
 * @deprecated Use serverUrls() directly instead.
 */
export function useServerPort(): number {
  return 0; // truthy-enough to pass null checks, but unused
}

/**
 * Build URLs for backend API endpoints.
 * With the custom server, everything is same-origin.
 */
export function serverUrls(_port?: number) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    api: origin,
    stream: `${origin}/api/events/stream`,
    health: `${origin}/health`,
    config: `${origin}/api/config`,
  };
}
