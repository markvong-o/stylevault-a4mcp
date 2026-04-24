import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { redis } from "./redis";

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

const REDIS_KEY = "retailzero:logs";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_HISTORY = 200;

class McpEventBus extends EventEmitter {
  private memory: McpLogEvent[] = [];

  emit(event: "mcp-log", data: McpLogEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: "mcp-log", listener: (data: McpLogEvent) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  push(event: Omit<McpLogEvent, "id" | "timestamp">): McpLogEvent {
    const full: McpLogEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    if (redis) {
      const score = Date.now();
      redis
        .pipeline()
        .zadd(REDIS_KEY, score, JSON.stringify(full))
        .zremrangebyscore(REDIS_KEY, "-inf", score - TTL_MS)
        .exec()
        .catch((err) => console.error("[event-bus] redis write error:", err.message));
    } else {
      this.memory.push(full);
      if (this.memory.length > MAX_HISTORY) this.memory.shift();
    }

    this.emit("mcp-log", full);
    return full;
  }

  async getHistory(): Promise<McpLogEvent[]> {
    if (!redis) return [...this.memory];

    try {
      const members = await redis.zrange(REDIS_KEY, 0, -1);
      return members.map((m) => JSON.parse(m) as McpLogEvent);
    } catch (err) {
      console.error("[event-bus] redis read error:", (err as Error).message);
      return [];
    }
  }

  async clear(): Promise<void> {
    if (!redis) {
      this.memory = [];
      return;
    }

    try {
      await redis.del(REDIS_KEY);
    } catch (err) {
      console.error("[event-bus] redis clear error:", (err as Error).message);
    }
  }
}

export const eventBus = new McpEventBus();
