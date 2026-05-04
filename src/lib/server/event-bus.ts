import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { redis } from "./redis";
import { currentScope, scopeKey, type EventScope } from "./scope-context";

export interface McpLogEvent {
  id: string;
  timestamp: string;
  type:
    | "session-init"
    | "auth-challenge"
    | "token-verified"
    | "token-rejected"
    | "metadata-fetch"
    | "tool-list"
    | "tool-call"
    | "tool-result"
    | "session-close"
    | "mcp-discovery"
    | "mcp-dcr"
    | "ucp-discovery"
    | "token-issued"
    | "consent"
    | string;
  result: "success" | "denied" | "error" | "info";
  summary: string;
  details: {
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    requestBody?: unknown;
    responseBody?: unknown;
    sessionId?: string;
    tokenClaims?: Record<string, unknown>;
    toolName?: string;
    toolArgs?: unknown;
    toolResult?: unknown;
    scopes?: string[];
    error?: string;
    duration?: number;
  };
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_HISTORY = 200;

class McpEventBus extends EventEmitter {
  /**
   * In-memory fallback when Redis is not configured. Keyed by scope
   * string so the same `clear(scope)` / `getHistory(scope)` semantics
   * hold regardless of backend.
   */
  private memory: Map<string, McpLogEvent[]> = new Map();

  emit(event: "mcp-log", data: McpLogEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: "mcp-log", listener: (data: McpLogEvent) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Push an event. Reads the active scope from AsyncLocalStorage. If
   * called outside a `scopeContext.run(...)` frame (shouldn't happen in
   * production paths), the event is dropped with a warning to avoid
   * cross-tenant leakage.
   */
  push(event: Omit<McpLogEvent, "id" | "timestamp">): McpLogEvent | null {
    const scope = currentScope();
    if (!scope) {
      console.warn("[event-bus] dropping event pushed outside scope context:", event.type);
      return null;
    }

    const full: McpLogEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const key = scopeKey(scope);

    if (redis) {
      const score = Date.now();
      const pipeline = redis.pipeline();
      pipeline.zadd(key, { score, member: JSON.stringify(full) });
      pipeline.zremrangebyscore(key, "-inf", score - TTL_MS);
      pipeline
        .exec()
        .catch((err: Error) => console.error("[event-bus] redis write error:", err.message));
    } else {
      const bucket = this.memory.get(key) ?? [];
      bucket.push(full);
      if (bucket.length > MAX_HISTORY) bucket.shift();
      this.memory.set(key, bucket);
    }

    this.emit("mcp-log", full);
    return full;
  }

  async getHistory(scope: EventScope): Promise<McpLogEvent[]> {
    const key = scopeKey(scope);

    if (!redis) {
      return [...(this.memory.get(key) ?? [])];
    }

    try {
      const members = (await redis.zrange(key, 0, -1)) as unknown[];
      return members.map((m) =>
        typeof m === "string" ? (JSON.parse(m) as McpLogEvent) : (m as McpLogEvent)
      );
    } catch (err) {
      console.error("[event-bus] redis read error:", (err as Error).message);
      return [];
    }
  }

  async clear(scope: EventScope): Promise<void> {
    const key = scopeKey(scope);

    if (!redis) {
      this.memory.delete(key);
      return;
    }

    try {
      await redis.del(key);
    } catch (err) {
      console.error("[event-bus] redis clear error:", (err as Error).message);
    }
  }
}

export const eventBus = new McpEventBus();
