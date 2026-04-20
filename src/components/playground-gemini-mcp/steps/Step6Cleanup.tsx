"use client";

import React from "react";
import type { GeminiMCPPlaygroundState } from "@/hooks/useGeminiMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";

interface Props {
  state: GeminiMCPPlaygroundState;
  onCleanup: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function Step6Cleanup({ state, onCleanup, onReset, onBack }: Props) {
  const isCleanedUp = !!state.requests.cleanup;

  return (
    <PlaygroundStepLayout
      title="Step 6: Cleanup Session"
      subtitle="Close the MCP session by sending a DELETE request. This releases server resources."
      rightPanel={
        <RequestResponsePanel
          label="Cleanup"
          request={state.requests.cleanup}
          loading={state.loading && !isCleanedUp}
        />
      }
      footer={
        <>
          <button
            onClick={onBack}
            className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Start Over
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
          <button onClick={onCleanup} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {!isCleanedUp && (
        <div className="space-y-4">
          {/* Session summary */}
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">Session Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
                <p className="text-lg font-semibold text-primary">{state.requestCount}</p>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider">MCP Requests</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
                <p className="text-lg font-semibold text-primary">{state.tools.length}</p>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider">UCP Tools</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
                <p className="text-lg font-semibold text-primary">{state.order ? "1" : "0"}</p>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider">Orders</p>
              </div>
            </div>
          </div>

          {/* UCP-over-MCP flow recap */}
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">UCP-over-MCP Flow</h3>
            <div className="space-y-2">
              {[
                { tool: "initialize", desc: "Established MCP session" },
                { tool: "ucp_discover", desc: "Retrieved UCP manifest via MCP" },
                { tool: "ucp_catalog_search", desc: "Searched products via MCP tool" },
                { tool: "ucp_product_details", desc: "Fetched product details via MCP tool" },
                { tool: "ucp_checkout_create", desc: "Created checkout with state machine" },
                { tool: "ucp_checkout_complete", desc: "Completed order" + (state.needsEscalation ? " (with CIBA escalation)" : "") },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-mono text-primary/60">{step.tool}</span>
                  <span className="text-[11px] text-foreground/35">{step.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onCleanup}
            disabled={state.loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.1] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {state.loading ? "Closing session..." : "Close Session"}
          </button>
        </div>
      )}

      {isCleanedUp && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h3 className="text-sm font-semibold text-emerald-700">Session Closed</h3>
            </div>
            <p className="text-xs text-foreground/40">
              The MCP session has been closed and server resources released. All UCP commerce operations were
              successfully transported over the MCP protocol layer, secured by Auth0.
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-2">Key Takeaway</h3>
            <p className="text-xs text-foreground/40 leading-relaxed">
              UCP commerce semantics (catalog, checkout state machine, escalation, bounded authority)
              work seamlessly over MCP transport. Auth0 provides the unified security layer -- OAuth 2.1 authentication,
              scoped tokens, JWKS validation, and CIBA escalation -- regardless of whether the transport is
              REST (direct UCP) or JSON-RPC (MCP).
            </p>
          </div>
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
