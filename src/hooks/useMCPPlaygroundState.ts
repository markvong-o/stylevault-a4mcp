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

export interface RequestRecord {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  response?: string;
  status?: number;
  latencyMs?: number;
}

export interface MCPPlaygroundState {
  step: number;
  sessionId: string | null;
  serverInfo: Record<string, unknown> | null;
  tools: Tool[];
  selectedTool: Tool | null;
  toolArgs: Record<string, string>;
  toolResult: unknown | null;
  boundedAuthorityResult: unknown | null;
  boundedAuthoritySuccessResult: unknown | null;
  requests: Record<string, RequestRecord>;
  requestCount: number;
  loading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type Action =
  | { type: "SET_STEP"; step: number }
  | { type: "SET_SESSION"; sessionId: string; serverInfo: Record<string, unknown>; request: RequestRecord }
  | { type: "SET_TOOLS"; tools: Tool[]; request: RequestRecord }
  | { type: "SELECT_TOOL"; tool: Tool }
  | { type: "SET_TOOL_ARGS"; args: Record<string, string> }
  | { type: "SET_TOOL_RESULT"; result: unknown; request: RequestRecord }
  | { type: "SET_BOUNDED_AUTHORITY"; result: unknown; request: RequestRecord }
  | { type: "SET_BOUNDED_AUTHORITY_SUCCESS"; result: unknown; request: RequestRecord }
  | { type: "SET_CLEANUP"; request: RequestRecord }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: MCPPlaygroundState = {
  step: 1,
  sessionId: null,
  serverInfo: null,
  tools: [],
  selectedTool: null,
  toolArgs: {},
  toolResult: null,
  boundedAuthorityResult: null,
  boundedAuthoritySuccessResult: null,
  requests: {},
  requestCount: 0,
  loading: false,
  error: null,
};

function reducer(state: MCPPlaygroundState, action: Action): MCPPlaygroundState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, error: null };
    case "SET_SESSION":
      return {
        ...state, sessionId: action.sessionId, serverInfo: action.serverInfo,
        requests: { ...state.requests, init: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_TOOLS":
      return {
        ...state, tools: action.tools,
        requests: { ...state.requests, tools: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SELECT_TOOL":
      return { ...state, selectedTool: action.tool, toolArgs: {}, toolResult: null };
    case "SET_TOOL_ARGS":
      return { ...state, toolArgs: action.args };
    case "SET_TOOL_RESULT":
      return {
        ...state, toolResult: action.result,
        requests: { ...state.requests, toolCall: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_BOUNDED_AUTHORITY":
      return {
        ...state, boundedAuthorityResult: action.result,
        requests: { ...state.requests, boundedAuthority: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_BOUNDED_AUTHORITY_SUCCESS":
      return {
        ...state, boundedAuthoritySuccessResult: action.result,
        requests: { ...state.requests, boundedAuthoritySuccess: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_CLEANUP":
      return {
        ...state,
        requests: { ...state.requests, cleanup: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
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

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useMCPPlaygroundState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const goToStep = useCallback((step: number) => dispatch({ type: "SET_STEP", step }), []);
  const selectTool = useCallback((tool: Tool) => dispatch({ type: "SELECT_TOOL", tool }), []);
  const setToolArgs = useCallback((args: Record<string, string>) => dispatch({ type: "SET_TOOL_ARGS", args }), []);
  const reset = useCallback(() => { rpcId = 0; dispatch({ type: "RESET" }); }, []);

  // ── Initialize session ──────────────────────────────────────

  const initializeSession = useCallback(async (baseUrl: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/mcp`;
    const body = rpcBody("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "StyleVault Playground", version: "1.0.0" },
    });
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const sessionId = res.headers.get("mcp-session-id") || res.headers.get("Mcp-Session-Id");
      const text = await res.text();

      // The MCP server may return SSE or JSON. Parse accordingly.
      let data: Record<string, unknown>;
      if (text.startsWith("event:") || text.startsWith("data:")) {
        // SSE format -- extract JSON from data lines
        const dataLine = text.split("\n").find(l => l.startsWith("data:"));
        data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
      } else {
        data = JSON.parse(text);
      }

      const request: RequestRecord = {
        method: "POST", url,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body, null, 2),
        response: JSON.stringify(data, null, 2),
        status: res.status, latencyMs,
      };

      if (!sessionId) {
        dispatch({ type: "SET_ERROR", error: "No Mcp-Session-Id header in response. Is the MCP server running?" });
        return;
      }

      dispatch({ type: "SET_SESSION", sessionId, serverInfo: data, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Session init failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  // ── List tools ──────────────────────────────────────────────

  const listTools = useCallback(async (baseUrl: string, sessionId: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/mcp`;
    const body = rpcBody("tools/list");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": sessionId,
    };
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const text = await res.text();
      let data: Record<string, unknown>;
      if (text.startsWith("event:") || text.startsWith("data:")) {
        const dataLine = text.split("\n").find(l => l.startsWith("data:"));
        data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
      } else {
        data = JSON.parse(text);
      }

      const result = data.result as { tools?: Tool[] } | undefined;
      const tools = result?.tools ?? [];

      const request: RequestRecord = {
        method: "POST", url, headers,
        body: JSON.stringify(body, null, 2),
        response: JSON.stringify(data, null, 2),
        status: res.status, latencyMs,
      };
      dispatch({ type: "SET_TOOLS", tools, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Tools list failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  // ── Call tool ───────────────────────────────────────────────

  const callTool = useCallback(async (baseUrl: string, sessionId: string, toolName: string, args: Record<string, unknown>) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/mcp`;
    const body = rpcBody("tools/call", { name: toolName, arguments: args });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": sessionId,
    };
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const text = await res.text();
      let data: Record<string, unknown>;
      if (text.startsWith("event:") || text.startsWith("data:")) {
        const dataLine = text.split("\n").find(l => l.startsWith("data:"));
        data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
      } else {
        data = JSON.parse(text);
      }

      const request: RequestRecord = {
        method: "POST", url, headers,
        body: JSON.stringify(body, null, 2),
        response: JSON.stringify(data, null, 2),
        status: res.status, latencyMs,
      };
      dispatch({ type: "SET_TOOL_RESULT", result: data, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Tool call failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  // ── Bounded authority demo ──────────────────────────────────

  const callBoundedAuthority = useCallback(async (baseUrl: string, sessionId: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/mcp`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": sessionId,
    };

    // First: the $2,400 watch (should be rejected)
    const overBody = rpcBody("tools/call", { name: "place_order", arguments: { product_id: "watch_meridian_001", quantity: 1 } });
    const start1 = performance.now();
    try {
      const res = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify(overBody),
        signal: AbortSignal.timeout(10000),
      });
      const latency1 = Math.round(performance.now() - start1);
      const text = await res.text();
      let data: Record<string, unknown>;
      if (text.startsWith("event:") || text.startsWith("data:")) {
        const dataLine = text.split("\n").find(l => l.startsWith("data:"));
        data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
      } else {
        data = JSON.parse(text);
      }

      dispatch({
        type: "SET_BOUNDED_AUTHORITY", result: data,
        request: { method: "POST", url, headers, body: JSON.stringify(overBody, null, 2), response: JSON.stringify(data, null, 2), status: res.status, latencyMs: latency1 },
      });

      // Second: the $89 sneakers (should succeed)
      const underBody = rpcBody("tools/call", { name: "place_order", arguments: { product_id: "sneakers_canvas_001", quantity: 1 } });
      const start2 = performance.now();
      const res2 = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify(underBody),
        signal: AbortSignal.timeout(10000),
      });
      const latency2 = Math.round(performance.now() - start2);
      const text2 = await res2.text();
      let data2: Record<string, unknown>;
      if (text2.startsWith("event:") || text2.startsWith("data:")) {
        const dataLine = text2.split("\n").find(l => l.startsWith("data:"));
        data2 = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
      } else {
        data2 = JSON.parse(text2);
      }

      dispatch({
        type: "SET_BOUNDED_AUTHORITY_SUCCESS", result: data2,
        request: { method: "POST", url, headers, body: JSON.stringify(underBody, null, 2), response: JSON.stringify(data2, null, 2), status: res2.status, latencyMs: latency2 },
      });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Bounded authority demo failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  // ── Cleanup session ─────────────────────────────────────────

  const cleanupSession = useCallback(async (baseUrl: string, sessionId: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/mcp`;
    const headers: Record<string, string> = { "mcp-session-id": sessionId };
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: "DELETE", headers,
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const request: RequestRecord = {
        method: "DELETE", url, headers,
        response: res.status === 200 ? "Session closed." : `Status: ${res.status}`,
        status: res.status, latencyMs,
      };
      dispatch({ type: "SET_CLEANUP", request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Session cleanup failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  return {
    state,
    goToStep,
    selectTool,
    setToolArgs,
    reset,
    initializeSession,
    listTools,
    callTool,
    callBoundedAuthority,
    cleanupSession,
  };
}
