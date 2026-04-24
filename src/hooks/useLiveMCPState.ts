"use client";

import { useReducer, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface LiveMCPState {
  sessionId: string | null;
  tools: Tool[];
  selectedTool: Tool | null;
  toolArgs: Record<string, string>;
  toolResult: unknown | null;
  loading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type Action =
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "SET_TOOLS"; tools: Tool[] }
  | { type: "SELECT_TOOL"; tool: Tool }
  | { type: "SET_TOOL_ARGS"; args: Record<string, string> }
  | { type: "SET_TOOL_RESULT"; result: unknown }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: LiveMCPState = {
  sessionId: null,
  tools: [],
  selectedTool: null,
  toolArgs: {},
  toolResult: null,
  loading: false,
  error: null,
};

function reducer(state: LiveMCPState, action: Action): LiveMCPState {
  switch (action.type) {
    case "SET_SESSION":
      return { ...state, sessionId: action.sessionId, loading: false, error: null };
    case "SET_TOOLS":
      return { ...state, tools: action.tools, loading: false, error: null };
    case "SELECT_TOOL":
      return { ...state, selectedTool: action.tool, toolArgs: {}, toolResult: null };
    case "SET_TOOL_ARGS":
      return { ...state, toolArgs: action.args };
    case "SET_TOOL_RESULT":
      return { ...state, toolResult: action.result, loading: false, error: null };
    case "SET_LOADING":
      return { ...state, loading: action.loading, error: null };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  JSON-RPC helpers                                                   */
/* ------------------------------------------------------------------ */

let rpcId = 0;

function rpcBody(method: string, params?: Record<string, unknown>) {
  rpcId++;
  return { jsonrpc: "2.0" as const, id: rpcId, method, ...(params ? { params } : {}) };
}

function parseSSEOrJSON(text: string): Record<string, unknown> {
  if (text.startsWith("event:") || text.startsWith("data:")) {
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    return dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
  }
  return JSON.parse(text);
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useLiveMCPState(accessToken: string) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const authHeaders = useCallback(
    (sessionId?: string | null): Record<string, string> => {
      const h: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${accessToken}`,
      };
      if (sessionId) h["mcp-session-id"] = sessionId;
      return h;
    },
    [accessToken]
  );

  const selectTool = useCallback((tool: Tool) => dispatch({ type: "SELECT_TOOL", tool }), []);
  const setToolArgs = useCallback((args: Record<string, string>) => dispatch({ type: "SET_TOOL_ARGS", args }), []);
  const reset = useCallback(() => {
    rpcId = 0;
    dispatch({ type: "RESET" });
  }, []);

  // ── Initialize session ──────────────────────────────────────

  const initSession = useCallback(async () => {
    dispatch({ type: "SET_LOADING", loading: true });
    const origin = window.location.origin;
    const body = rpcBody("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "RetailZero Live Playground", version: "1.0.0" },
    });

    try {
      const res = await fetch(`${origin}/mcp`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401) {
        dispatch({ type: "SET_ERROR", error: "Authentication failed. Your token may be expired. Try logging in again." });
        return;
      }

      const sessionId = res.headers.get("mcp-session-id") || res.headers.get("Mcp-Session-Id");
      if (!sessionId) {
        dispatch({ type: "SET_ERROR", error: "No session ID returned. Is the MCP server running?" });
        return;
      }

      dispatch({ type: "SET_SESSION", sessionId });

      // Auto-fetch tools after session init
      const toolsBody = rpcBody("tools/list");
      const toolsRes = await fetch(`${origin}/mcp`, {
        method: "POST",
        headers: authHeaders(sessionId),
        body: JSON.stringify(toolsBody),
        signal: AbortSignal.timeout(10000),
      });

      const toolsText = await toolsRes.text();
      const toolsData = parseSSEOrJSON(toolsText);
      const result = toolsData.result as { tools?: Tool[] } | undefined;
      dispatch({ type: "SET_TOOLS", tools: result?.tools ?? [] });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Init failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, [authHeaders]);

  // ── Call tool ───────────────────────────────────────────────

  const callTool = useCallback(
    async (toolName: string, args: Record<string, unknown>) => {
      if (!state.sessionId) {
        dispatch({ type: "SET_ERROR", error: "No active session. Initialize first." });
        return;
      }

      dispatch({ type: "SET_LOADING", loading: true });
      const origin = window.location.origin;
      const body = rpcBody("tools/call", { name: toolName, arguments: args });

      try {
        const res = await fetch(`${origin}/mcp`, {
          method: "POST",
          headers: authHeaders(state.sessionId),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });

        const text = await res.text();
        const data = parseSSEOrJSON(text);
        dispatch({ type: "SET_TOOL_RESULT", result: data });
      } catch (e) {
        dispatch({ type: "SET_ERROR", error: `Tool call failed: ${e instanceof Error ? e.message : "Unknown error"}` });
      }
    },
    [state.sessionId, authHeaders]
  );

  return {
    state,
    selectTool,
    setToolArgs,
    reset,
    initSession,
    callTool,
  };
}
