"use client";

import { useEffect, useRef, useCallback } from "react";
import type { DemoStep } from "@/lib/types";
import { serverUrls } from "@/hooks/useServerPort";

/**
 * Fire-and-forget hook that sends real API calls as demo steps progress.
 *
 * - For steps with `chat.toolCall`, fires the corresponding MCP or UCP call
 * - For steps with `securityEvent`, either fires a real discovery call or
 *   pushes a synthetic log event via POST /api/events
 * - MCP session init fires eagerly on the first step (not lazily on first tool call)
 */
export function useDemoLiveCalls(
  scenarioId: string,
  steps: DemoStep[],
  currentStep: number
) {
  const sessionRef = useRef<string | null>(null);
  const checkoutSessionRef = useRef<string | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const rpcIdRef = useRef(0);
  const initPromiseRef = useRef<Promise<string | null> | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const endpointFor = (sid: string) =>
    sid === "scenario-b"
      ? "/mcp"
      : sid === "scenario-d"
        ? "/gemini-mcp"
        : null;

  const endpoint = endpointFor(scenarioId);

  // ── JSON-RPC helpers ─────────────────────────────────────────

  function nextRpcId() {
    rpcIdRef.current += 1;
    return rpcIdRef.current;
  }

  function rpcBody(method: string, params?: Record<string, unknown>) {
    return {
      jsonrpc: "2.0" as const,
      id: nextRpcId(),
      method,
      ...(params ? { params } : {}),
    };
  }

  async function mcpPost(
    path: string,
    body: unknown,
    sessionId?: string | null
  ): Promise<{ data: Record<string, unknown>; sessionId: string | null }> {
    const url = `${serverUrls().api}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (sessionId) headers["mcp-session-id"] = sessionId;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    if (text.startsWith("event:") || text.startsWith("data:")) {
      const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
      data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
    } else {
      data = text ? JSON.parse(text) : {};
    }

    const sid =
      res.headers.get("mcp-session-id") ||
      res.headers.get("Mcp-Session-Id");

    return { data, sessionId: sid };
  }

  // ── MCP session init (shared promise so concurrent callers wait) ──

  async function ensureSession(path: string): Promise<string | null> {
    if (sessionRef.current) return sessionRef.current;

    if (!initPromiseRef.current) {
      initPromiseRef.current = (async () => {
        try {
          const body = rpcBody("initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: {
              name:
                path === "/mcp"
                  ? "ChatGPT Demo"
                  : "Gemini UCP-over-MCP Demo",
              version: "1.0.0",
            },
          });
          const { sessionId: sid } = await mcpPost(path, body);
          if (sid) {
            sessionRef.current = sid;
            await mcpPost(path, rpcBody("tools/list"), sid);
          }
          return sessionRef.current;
        } catch {
          return null;
        }
      })();
    }

    return initPromiseRef.current;
  }

  const cleanupSession = useCallback(async (path: string) => {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const url = `${serverUrls().api}${path}`;
      await fetch(url, {
        method: "DELETE",
        headers: { "mcp-session-id": sid },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // fire-and-forget
    }
    sessionRef.current = null;
    checkoutSessionRef.current = null;
    initPromiseRef.current = null;
  }, []);

  async function mcpToolCall(
    path: string,
    toolName: string,
    args: Record<string, unknown> = {}
  ) {
    const sid = await ensureSession(path);
    if (!sid) return;
    try {
      const { data } = await mcpPost(
        path,
        rpcBody("tools/call", { name: toolName, arguments: args }),
        sid
      );
      if (toolName === "ucp_checkout_create" && data.result) {
        const resultContent = data.result as {
          content?: { text?: string }[];
        };
        try {
          const parsed = JSON.parse(
            resultContent?.content?.[0]?.text || "{}"
          );
          if (parsed.session_id) {
            checkoutSessionRef.current = parsed.session_id;
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // fire-and-forget
    }
  }

  // ── UCP REST helpers ─────────────────────────────────────────

  async function ucpGet(path: string) {
    try {
      const url = `${serverUrls().api}${path}`;
      await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch {
      // fire-and-forget
    }
  }

  async function ucpPost(path: string, body: unknown) {
    try {
      const url = `${serverUrls().api}${path}`;
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      return null;
    }
  }

  // ── Push a synthetic log event to the server event bus ───────

  function pushLogEvent(
    type: string,
    result: string,
    summary: string,
    details?: Record<string, unknown>
  ) {
    fetch(`${serverUrls().api}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, result, summary, details }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }

  // ── Dispatch: MCP tool calls ────────────────────────────────

  function fireMcpCall(path: string, toolName: string, step: DemoStep) {
    const isDenied = step.chat?.toolCall?.status === "denied";
    switch (toolName) {
      case "get_wishlist":
        mcpToolCall(path, "get_wishlist");
        break;
      case "search_products":
        mcpToolCall(path, "search_products", { query: "leather bag", max_price: 300 });
        break;
      case "get_order_history":
        mcpToolCall(path, "get_order_history");
        break;
      case "place_order":
        mcpToolCall(path, "place_order", {
          product_id: isDenied ? "watch_meridian_001" : "bag_heritage_001",
          quantity: 1,
        });
        break;
      case "update_preferences":
        mcpToolCall(path, "update_preferences", {
          add: ["leather bags", "weekend travel"],
        });
        break;
    }
  }

  function fireUcpRestCall(toolName: string, step: DemoStep) {
    switch (toolName) {
      case "ucp_catalog_search":
        ucpGet("/ucp/v1/catalog/search?q=leather+bag&max_price=300");
        break;
      case "ucp_create_checkout": {
        const isDenied = step.chat?.toolCall?.status === "denied";
        const productId = isDenied ? "watch_meridian_001" : "bag_heritage_001";
        ucpPost("/ucp/v1/checkout/sessions", {
          line_items: [{ product_id: productId, quantity: 1 }],
          buyer: { email: "alex@example.com" },
        }).then((res) => {
          if (res) {
            res.json().then((data) => {
              if (data.session_id) checkoutSessionRef.current = data.session_id;
            }).catch(() => {});
          }
        });
        break;
      }
      case "ucp_complete_checkout": {
        const sid = checkoutSessionRef.current;
        if (sid) {
          const url = `${serverUrls().api}/ucp/v1/checkout/sessions/${sid}/complete`;
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-UCP-Escalation-Token": `esc_${sid}_approved`,
            },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(5000),
          }).catch(() => {});
        }
        break;
      }
      case "ucp_get_order":
        ucpGet("/ucp/v1/orders");
        break;
    }
  }

  function fireGeminiMcpCall(path: string, toolName: string, step: DemoStep) {
    const isDenied = step.chat?.toolCall?.status === "denied";
    switch (toolName) {
      case "ucp_discover":
        mcpToolCall(path, "ucp_discover");
        break;
      case "ucp_catalog_search":
        mcpToolCall(path, "ucp_catalog_search", { query: "leather bag", max_price: 300 });
        break;
      case "ucp_checkout_create":
        mcpToolCall(path, "ucp_checkout_create", {
          product_id: isDenied ? "watch_meridian_001" : "bag_heritage_001",
          quantity: 1,
        });
        break;
      case "ucp_checkout_complete": {
        const sid = checkoutSessionRef.current;
        if (sid) mcpToolCall(path, "ucp_checkout_complete", {
          session_id: sid,
          escalation_token: `esc_${sid}_approved`,
        });
        break;
      }
    }
  }

  // ── Dispatch: security events → real calls or synthetic logs ─

  function fireSecurityEvent(step: DemoStep) {
    const evt = step.securityEvent;
    if (!evt) return;

    // MCP session init -- server emits its own log events for this
    if (evt.type === "mcp-dcr" && endpoint) {
      ensureSession(endpoint);
      return;
    }

    // All other security events: push synthetic log matching the narrative
    const resultMap: Record<string, string> = {
      granted: "success",
      denied: "denied",
      pending: "info",
      approved: "success",
      info: "info",
    };

    // Build rich details from technicalDetail so events are expandable in logs
    const td = evt.technicalDetail;
    const details: Record<string, unknown> = { scenarioId, stepId: step.id };

    if (td) {
      if (td.request) details.requestBody = td.request;
      if (td.response) details.responseBody = td.response;
      if (td.tokenClaims) details.tokenClaims = td.tokenClaims;
      if (td.tokenExchange) {
        details.requestBody = details.requestBody || td.tokenExchange.request;
        details.responseBody = details.responseBody || td.tokenExchange.response;
      }
      if (td.downstreamApi) {
        details.toolArgs = td.downstreamApi.request;
        details.toolResult = td.downstreamApi.response;
      }
      if (td.protocol) {
        details.headers = { protocol: td.protocol };
      }
    }

    pushLogEvent(
      evt.type,
      resultMap[evt.result] || "info",
      evt.shortDescription,
      details,
    );
  }

  // ── Fire call for a single step ──────────────────────────────

  const fireForStep = useCallback((step: DemoStep) => {
    const toolName = step.chat?.toolCall?.name;

    if (toolName) {
      if (scenarioId === "scenario-b" && endpoint) {
        fireMcpCall(endpoint, toolName, step);
      } else if (scenarioId === "scenario-c") {
        fireUcpRestCall(toolName, step);
      } else if (scenarioId === "scenario-d" && endpoint) {
        fireGeminiMcpCall(endpoint, toolName, step);
      }
      return;
    }

    if (step.securityEvent) {
      fireSecurityEvent(step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, endpoint]);

  // ── Reset on scenario change ─────────────────────────────────

  const prevScenarioRef = useRef(scenarioId);

  useEffect(() => {
    if (prevScenarioRef.current !== scenarioId) {
      const prevEp = endpointFor(prevScenarioRef.current);
      if (prevEp) cleanupSession(prevEp);
      firedRef.current = new Set();
      rpcIdRef.current = 0;
      checkoutSessionRef.current = null;
      initPromiseRef.current = null;
      prevScenarioRef.current = scenarioId;
    }
  }, [scenarioId, cleanupSession]);

  // Cleanup on true unmount
  useEffect(() => {
    return () => {
      const sid = sessionRef.current;
      const ep = endpointFor(prevScenarioRef.current);
      if (ep && sid) {
        fetch(`${serverUrls().api}${ep}`, {
          method: "DELETE",
          headers: { "mcp-session-id": sid },
          keepalive: true,
        }).catch(() => {});
        sessionRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fire calls as steps progress ─────────────────────────────

  useEffect(() => {
    const step = stepsRef.current[currentStep];
    if (!step) return;

    const key = step.id;
    if (firedRef.current.has(key)) return;

    const hasToolCall = !!step.chat?.toolCall?.name;
    const hasSecurityEvent = !!step.securityEvent;

    if (!hasToolCall && !hasSecurityEvent) return;

    firedRef.current.add(key);
    fireForStep(step);
  }, [currentStep, fireForStep]);
}
