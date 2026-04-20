"use client";

import { useReducer, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
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

export interface CheckoutSession {
  session_id: string;
  status: string;
  line_items: { product_id: string; quantity: number; name: string; price: number }[];
  total: number;
  buyer_email?: string;
  continue_url?: string;
  order_id?: string;
  messages: { severity: string; text: string }[];
  created_at: string;
  updated_at: string;
}

export interface Order {
  order_id: string;
  status: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  buyer_email: string;
  shipment?: {
    status: string;
    carrier?: string;
    tracking_number?: string;
    estimated_delivery?: string;
  };
  created_at: string;
}

export interface PlaygroundState {
  step: number;
  manifest: Record<string, unknown> | null;
  products: Product[];
  searchQuery: string;
  selectedProduct: Product | null;
  quantity: number;
  checkoutSession: CheckoutSession | null;
  needsEscalation: boolean;
  escalationToken: string | null;
  order: Order | null;
  requests: Record<string, RequestRecord>;
  loading: boolean;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type Action =
  | { type: "SET_STEP"; step: number }
  | { type: "SET_MANIFEST"; manifest: Record<string, unknown>; request: RequestRecord }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_PRODUCTS"; products: Product[]; request: RequestRecord }
  | { type: "SELECT_PRODUCT"; product: Product }
  | { type: "SET_QUANTITY"; quantity: number }
  | { type: "SET_CHECKOUT"; session: CheckoutSession; request: RequestRecord }
  | { type: "SET_ESCALATION_TOKEN"; token: string }
  | { type: "SET_ORDER"; order: Order; request: RequestRecord; completeRequest: RequestRecord }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: PlaygroundState = {
  step: 1,
  manifest: null,
  products: [],
  searchQuery: "leather",
  selectedProduct: null,
  quantity: 1,
  checkoutSession: null,
  needsEscalation: false,
  escalationToken: null,
  order: null,
  requests: {},
  loading: false,
  error: null,
};

function reducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, error: null };
    case "SET_MANIFEST":
      return {
        ...state,
        manifest: action.manifest,
        requests: { ...state.requests, manifest: action.request },
        loading: false,
        error: null,
      };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };
    case "SET_PRODUCTS":
      return {
        ...state,
        products: action.products,
        requests: { ...state.requests, catalog: action.request },
        loading: false,
        error: null,
      };
    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.product };
    case "SET_QUANTITY":
      return { ...state, quantity: Math.max(1, action.quantity) };
    case "SET_CHECKOUT":
      return {
        ...state,
        checkoutSession: action.session,
        needsEscalation: action.session.status === "requires_escalation",
        requests: { ...state.requests, checkout: action.request },
        loading: false,
        error: null,
      };
    case "SET_ESCALATION_TOKEN":
      return { ...state, escalationToken: action.token };
    case "SET_ORDER":
      return {
        ...state,
        order: action.order,
        requests: {
          ...state.requests,
          complete: action.completeRequest,
          order: action.request,
        },
        loading: false,
        error: null,
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
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function usePlaygroundState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", query });
  }, []);

  const selectProduct = useCallback((product: Product) => {
    dispatch({ type: "SELECT_PRODUCT", product });
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    dispatch({ type: "SET_QUANTITY", quantity });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  /* -- API actions ------------------------------------------------- */

  const fetchManifest = useCallback(async (baseUrl: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/.well-known/ucp`;
    const start = performance.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json();
      const request: RequestRecord = {
        method: "GET",
        url,
        response: JSON.stringify(data, null, 2),
        status: res.status,
        latencyMs,
      };
      dispatch({ type: "SET_MANIFEST", manifest: data, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Failed to fetch manifest: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  const searchCatalog = useCallback(async (baseUrl: string, query: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/ucp/v1/catalog/search?q=${encodeURIComponent(query)}`;
    const start = performance.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json();
      const request: RequestRecord = {
        method: "GET",
        url,
        response: JSON.stringify(data, null, 2),
        status: res.status,
        latencyMs,
      };
      dispatch({ type: "SET_PRODUCTS", products: data.results ?? [], request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Catalog search failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  const createCheckout = useCallback(async (baseUrl: string, productId: string, quantity: number) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const url = `${baseUrl}/ucp/v1/checkout/sessions`;
    const body = {
      line_items: [{ product_id: productId, quantity }],
      buyer: { email: "alex@example.com" },
    };
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json();
      const request: RequestRecord = {
        method: "POST",
        url,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body, null, 2),
        response: JSON.stringify(data, null, 2),
        status: res.status,
        latencyMs,
      };
      if (!res.ok) {
        dispatch({ type: "SET_ERROR", error: data.error_description ?? `HTTP ${res.status}` });
        return;
      }
      dispatch({ type: "SET_CHECKOUT", session: data, request });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Checkout creation failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  const simulateEscalation = useCallback((sessionId: string) => {
    const token = `mock-escalation-token-${sessionId}`;
    dispatch({ type: "SET_ESCALATION_TOKEN", token });
  }, []);

  const completeCheckout = useCallback(async (baseUrl: string, sessionId: string, escalationToken: string | null) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const completeUrl = `${baseUrl}/ucp/v1/checkout/sessions/${sessionId}/complete`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (escalationToken) {
      headers["X-UCP-Escalation-Token"] = escalationToken;
    }

    const start = performance.now();
    try {
      const res = await fetch(completeUrl, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json();
      const completeRequest: RequestRecord = {
        method: "POST",
        url: completeUrl,
        headers,
        response: JSON.stringify(data, null, 2),
        status: res.status,
        latencyMs,
      };

      if (!res.ok) {
        dispatch({ type: "SET_ERROR", error: data.error_description ?? `HTTP ${res.status}` });
        return;
      }

      // Now fetch the order
      const orderId = data.order_id;
      const orderUrl = `${baseUrl}/ucp/v1/orders/${orderId}`;
      const orderStart = performance.now();
      const orderRes = await fetch(orderUrl, { signal: AbortSignal.timeout(10000) });
      const orderLatency = Math.round(performance.now() - orderStart);
      const orderData = await orderRes.json();
      const orderRequest: RequestRecord = {
        method: "GET",
        url: orderUrl,
        response: JSON.stringify(orderData, null, 2),
        status: orderRes.status,
        latencyMs: orderLatency,
      };

      dispatch({ type: "SET_ORDER", order: orderData, request: orderRequest, completeRequest });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: `Checkout completion failed: ${e instanceof Error ? e.message : "Unknown error"}` });
    }
  }, []);

  return {
    state,
    goToStep,
    setSearchQuery,
    selectProduct,
    setQuantity,
    reset,
    fetchManifest,
    searchCatalog,
    createCheckout,
    simulateEscalation,
    completeCheckout,
  };
}
