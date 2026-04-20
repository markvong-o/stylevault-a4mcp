import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

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
    | "session-close";
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

const MAX_HISTORY = 200;

class McpEventBus extends EventEmitter {
  private history: McpLogEvent[] = [];

  emit(event: "mcp-log", data: McpLogEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: "mcp-log", listener: (data: McpLogEvent) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Push a new event, store it in the history ring buffer, and emit.
   */
  push(event: Omit<McpLogEvent, "id" | "timestamp">): McpLogEvent {
    const full: McpLogEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.history.push(full);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.emit("mcp-log", full);
    return full;
  }

  /**
   * Return the buffered history so new WebSocket clients can catch up.
   */
  getHistory(): McpLogEvent[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}

export const eventBus = new McpEventBus();
