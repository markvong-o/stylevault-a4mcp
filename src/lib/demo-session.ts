/**
 * Per-browser-tab demo session ID.
 *
 * Used to scope pre-canned demo events so two tabs viewing the demo do
 * not bleed log events into each other. The ID lives in sessionStorage
 * (per-tab, survives reloads) and is attached as the X-Demo-Session
 * header to every MCP / UCP / events API call the demo fires.
 */
export function getDemoSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "demo-session-id";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}
