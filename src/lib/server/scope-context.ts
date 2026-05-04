import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Scope under which an event was produced.
 *
 *  - `user`  : authenticated Auth0 identity (live playground).
 *  - `demo`  : per-browser-tab UUID minted client-side by the pre-canned
 *              demo flow. Lets two concurrent anonymous viewers keep
 *              their event streams separate.
 */
export type EventScope =
  | { type: "user"; sub: string }
  | { type: "demo"; sid: string };

/**
 * Request-scoped context carrying the active EventScope through async
 * boundaries. Route handlers establish a scope at entry with
 * `scopeContext.run(scope, body)`; any `eventBus.push()` call downstream
 * (including inside MCP tool callbacks) reads it via `currentScope()`.
 */
export const scopeContext = new AsyncLocalStorage<EventScope>();

export function currentScope(): EventScope | undefined {
  return scopeContext.getStore();
}

/**
 * Build the Redis key / memory-map key for a scope. Keeps each scope's
 * events in its own sorted set so `clear` is a single DEL.
 */
export function scopeKey(scope: EventScope): string {
  return scope.type === "user"
    ? `retailzero:logs:user:${scope.sub}`
    : `retailzero:logs:demo:${scope.sid}`;
}
