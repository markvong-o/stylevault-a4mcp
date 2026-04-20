"use client";

import { useReducer, useCallback } from "react";
import type { Product, CheckoutSession, Order, RequestRecord } from "./usePlaygroundState";

export type { Product, CheckoutSession, Order, RequestRecord };

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

export interface GeminiMCPPlaygroundState {
  step: number;
  sessionId: string | null;
  serverInfo: Record<string, unknown> | null;
  ucpManifest: Record<string, unknown> | null;
  tools: { name: string; description?: string; inputSchema?: Record<string, unknown> }[];
  products: Product[];
  searchQuery: string;
  selectedProduct: Product | null;
  productDetails: Product | null;
  quantity: number;
  checkoutSession: CheckoutSession | null;
  needsEscalation: boolean;
  escalationToken: string | null;
  order: Order | null;
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
  | { type: "SET_TOOLS"; tools: GeminiMCPPlaygroundState["tools"]; request: RequestRecord }
  | { type: "SET_MANIFEST"; manifest: Record<string, unknown>; request: RequestRecord }
  | { type: "SET_PRODUCTS"; products: Product[]; request: RequestRecord }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SELECT_PRODUCT"; product: Product }
  | { type: "SET_PRODUCT_DETAILS"; product: Product; request: RequestRecord }
  | { type: "SET_QUANTITY"; quantity: number }
  | { type: "SET_CHECKOUT"; session: CheckoutSession; needsEscalation: boolean; request: RequestRecord }
  | { type: "SET_ESCALATION_TOKEN"; token: string }
  | { type: "SET_ORDER"; order: Order; session: CheckoutSession; request: RequestRecord }
  | { type: "SET_CLEANUP"; request: RequestRecord }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: GeminiMCPPlaygroundState = {
  step: 1,
  sessionId: null,
  serverInfo: null,
  ucpManifest: null,
  tools: [],
  products: [],
  searchQuery: "leather",
  selectedProduct: null,
  productDetails: null,
  quantity: 1,
  checkoutSession: null,
  needsEscalation: false,
  escalationToken: null,
  order: null,
  requests: {},
  requestCount: 0,
  loading: false,
  error: null,
};

function reducer(state: GeminiMCPPlaygroundState, action: Action): GeminiMCPPlaygroundState {
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
    case "SET_MANIFEST":
      return {
        ...state, ucpManifest: action.manifest,
        requests: { ...state.requests, discover: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_PRODUCTS":
      return {
        ...state, products: action.products,
        requests: { ...state.requests, catalog: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };
    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.product };
    case "SET_PRODUCT_DETAILS":
      return {
        ...state, productDetails: action.product, selectedProduct: action.product,
        requests: { ...state.requests, productDetails: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_QUANTITY":
      return { ...state, quantity: action.quantity };
    case "SET_CHECKOUT":
      return {
        ...state, checkoutSession: action.session, needsEscalation: action.needsEscalation,
        requests: { ...state.requests, checkout: action.request },
        requestCount: state.requestCount + 1, loading: false, error: null,
      };
    case "SET_ESCALATION_TOKEN":
      return { ...state, escalationToken: action.token };
    case "SET_ORDER":
      return {
        ...state, order: action.order, checkoutSession: action.session,
        requests: { ...state.requests, complete: action.request },
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

/**
 * Parse MCP server response that may be SSE or JSON.
 */
function parseResponse(text: string): Record<string, unknown> {
  if (text.startsWith("event:") || text.startsWith("data:")) {
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    return dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
  }
  return JSON.parse(text);
}

/**
 * Extract the text content from a tools/call response.
 */
function extractToolContent(data: Record<string, unknown>): unknown {
  const result = data.result as { content?: { type: string; text: string }[] } | undefined;
  if (result?.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return result.content[0].text;
    }
  }
  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useGeminiMCPPlaygroundState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const goToStep = useCallback((step: number) => dispatch({ type: "SET_STEP", step }), []);
  const setSearchQuery = useCallback((query: string) => dispatch({ type: "SET_SEARCH_QUERY", query }), []);
  const selectProduct = useCallback((product: Product) => dispatch({ type: "SELECT_PRODUCT", product }), []);
  const setQuantity = useCallback((quantity: number) => dispatch({ type: "SET_QUANTITY", quantity }), []);
  const setEscalationToken = useCallback((token: string) => dispatch({ type: "SET_ESCALATION_TOKEN", token }), []);
  const reset = useCallback(() => { rpcId = 0; dispatch({ type: "RESET" }); }, []);

  // ── Initialize MCP session ──────────────────────────────────

  const initializeSession = useCallback(async (baseUrl: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/gemini-mcp`;
    const body = rpcBody("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "Gemini UCP-over-MCP Playground", version: "1.0.0" },
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
      const data = parseResponse(text);

      const request: RequestRecord = {
        method: "POST", url,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body, null, 2),
        response: JSON.stringify(data, null, 2),
        status: res.status, latencyMs,
      };

      if (!sessionId) {
        dispatch({ type: "SET_ERROR", error: "No Mcp-Session-Id header in response. Is the server running?" });
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
    const url = `${baseUrl}/gemini-mcp`;
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
      const data = parseResponse(text);
      const result = data.result as { tools?: GeminiMCPPlaygroundState["tools"] } | undefined;
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

  // ── Generic tool call helper ────────────────────────────────

  const callTool = useCallback(async (baseUrl: string, sessionId: string, toolName: string, args: Record<string, unknown> = {}) => {
    const url = `${baseUrl}/gemini-mcp`;
    const body = rpcBody("tools/call", { name: toolName, arguments: args });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": sessionId,
    };
    const start = performance.now();
    const res = await fetch(url, {
      method: "POST", headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Math.round(performance.now() - start);
    const text = await res.text();
    const data = parseResponse(text);
    const content = extractToolContent(data);

    const request: RequestRecord = {
      method: "POST", url, headers,
      body: JSON.stringify(body, null, 2),
      response: JSON.stringify(data, null, 2),
      status: res.status, latencyMs,
    };

    return { data, content, request };
  }, []);

  // ── Discover UCP manifest ───────────────────────────────────

  const discoverUCP = useCallback(async (baseUrl: string, sessionId: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const { content, request } = await callTool(baseUrl, sessionId, "ucp_discover");
      dispatch({ type: "SET_MANIFEST", manifest: content as Record<string, unknown>, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `UCP discovery failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, [callTool]);

  // ── Search catalog ──────────────────────────────────────────

  const searchCatalog = useCallback(async (baseUrl: string, sessionId: string, query: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const { content, request } = await callTool(baseUrl, sessionId, "ucp_catalog_search", { query });
      const result = content as { results: Product[]; total: number };
      dispatch({ type: "SET_PRODUCTS", products: result.results || [], request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Catalog search failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, [callTool]);

  // ── Get product details ─────────────────────────────────────

  const getProductDetails = useCallback(async (baseUrl: string, sessionId: string, productId: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const { content, request } = await callTool(baseUrl, sessionId, "ucp_product_details", { product_id: productId });
      dispatch({ type: "SET_PRODUCT_DETAILS", product: content as Product, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Product details failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, [callTool]);

  // ── Create checkout ─────────────────────────────────────────

  const createCheckout = useCallback(async (baseUrl: string, sessionId: string, productId: string, qty: number) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const { content, request } = await callTool(baseUrl, sessionId, "ucp_checkout_create", {
        product_id: productId,
        quantity: qty,
      });
      const session = content as CheckoutSession;
      const needsEscalation = session.status === "requires_escalation";
      dispatch({ type: "SET_CHECKOUT", session, needsEscalation, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Checkout failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, [callTool]);

  // ── Complete checkout ───────────────────────────────────────

  const completeCheckout = useCallback(async (baseUrl: string, sessionId: string, checkoutSessionId: string, escalationToken?: string | null) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const args: Record<string, unknown> = { session_id: checkoutSessionId };
      if (escalationToken) {
        args.escalation_token = escalationToken;
      }
      const { content, request } = await callTool(baseUrl, sessionId, "ucp_checkout_complete", args);
      const result = content as { checkout_session: CheckoutSession; order: Order };
      dispatch({ type: "SET_ORDER", order: result.order, session: result.checkout_session, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Checkout completion failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, [callTool]);

  // ── Cleanup session ─────────────────────────────────────────

  const cleanupSession = useCallback(async (baseUrl: string, sessionId: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/gemini-mcp`;
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
    setSearchQuery,
    selectProduct,
    setQuantity,
    setEscalationToken,
    reset,
    initializeSession,
    listTools,
    discoverUCP,
    searchCatalog,
    getProductDetails,
    createCheckout,
    completeCheckout,
    cleanupSession,
  };
}
