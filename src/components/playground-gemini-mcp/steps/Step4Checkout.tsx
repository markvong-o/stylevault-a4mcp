"use client";

import React from "react";
import type { GeminiMCPPlaygroundState } from "@/hooks/useGeminiMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";
import { Auth0Placeholder } from "../../playground/Auth0Placeholder";

interface Props {
  state: GeminiMCPPlaygroundState;
  onCreateCheckout: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4Checkout({ state, onCreateCheckout, onNext, onBack }: Props) {
  const product = state.selectedProduct;
  const total = product ? product.price * state.quantity : 0;
  const session = state.checkoutSession;

  return (
    <PlaygroundStepLayout
      title="Step 4: Create Checkout Session"
      subtitle="Call ucp_checkout_create to start a UCP checkout via MCP. The server applies its state machine and bounded authority rules."
      rightPanel={
        <RequestResponsePanel
          label="ucp_checkout_create"
          request={state.requests.checkout}
          loading={state.loading && !session}
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
            onClick={onNext}
            disabled={!session}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next: {state.needsEscalation ? "Handle Escalation" : "Complete Order"}
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
          <button onClick={onCreateCheckout} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Order summary before checkout */}
      {product && !session && (
        <div className="space-y-4">
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">Order Summary</h3>
            <div className="flex items-center justify-between py-2 border-b border-foreground/[0.04]">
              <div>
                <p className="text-sm text-foreground/60">{product.name}</p>
                <p className="text-[10px] text-foreground/30">Qty: {state.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-foreground/70">${total.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-semibold text-foreground/70">Total</p>
              <p className={`text-sm font-bold ${total > 250 ? "text-amber-600" : "text-foreground/80"}`}>
                ${total.toFixed(2)}
              </p>
            </div>
            {total > 250 && (
              <div className="mt-3 px-2 py-1.5 rounded bg-amber-500/[0.06] border border-amber-500/20">
                <p className="text-[11px] text-amber-600">
                  Exceeds $250 agent limit. The checkout will enter &quot;requires_escalation&quot; state.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onCreateCheckout}
            disabled={state.loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {state.loading ? "Creating checkout..." : "Create Checkout via MCP"}
          </button>
        </div>
      )}

      {/* Checkout session result */}
      {session && (
        <div className="space-y-4">
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground/70">Checkout Session</h3>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${
                session.status === "ready_for_complete"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : session.status === "requires_escalation"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-foreground/[0.05] text-foreground/40 border-foreground/[0.1]"
              }`}>
                {session.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Session ID</p>
                <p className="text-xs font-mono text-foreground/50 break-all">{session.session_id}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-sm font-semibold text-foreground/70">${session.total.toFixed(2)}</p>
              </div>
            </div>

            {/* State machine visualization */}
            <div className="mt-3 p-3 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-2">UCP State Machine</p>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-foreground/[0.06] text-foreground/40">incomplete</span>
                <span className="text-foreground/20">&rarr;</span>
                <span className={`px-2 py-0.5 rounded ${
                  session.status === "requires_escalation"
                    ? "bg-amber-500/15 text-amber-600 font-semibold"
                    : session.status === "ready_for_complete"
                      ? "bg-emerald-500/15 text-emerald-600 font-semibold"
                      : "bg-foreground/[0.06] text-foreground/40"
                }`}>
                  {session.status}
                </span>
              </div>
            </div>

            {/* Messages */}
            {session.messages?.length > 0 && (
              <div className="mt-3 space-y-1">
                {session.messages.map((msg, i) => (
                  <div key={i} className={`text-[11px] px-2 py-1 rounded ${
                    msg.severity === "requires_buyer_input"
                      ? "bg-amber-500/[0.06] text-amber-600"
                      : "bg-foreground/[0.03] text-foreground/40"
                  }`}>
                    {msg.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.needsEscalation && (
            <Auth0Placeholder
              title="Auth0 CIBA Escalation Required"
              description="The checkout total exceeds the agent's $250 bounded authority. Auth0 CIBA will send a push notification to the buyer's device for explicit approval before the order can be completed."
              variant="action"
            />
          )}

          {!state.needsEscalation && (
            <Auth0Placeholder
              title="Bounded Authority Check Passed"
              description="The checkout total is within the agent's $250 authority limit. The session can proceed to completion without buyer escalation. Auth0 enforces this limit via token claims."
            />
          )}
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
