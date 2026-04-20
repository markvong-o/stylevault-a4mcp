"use client";

import React from "react";
import type { GeminiMCPPlaygroundState } from "@/hooks/useGeminiMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";
import { Auth0Placeholder } from "../../playground/Auth0Placeholder";

interface Props {
  state: GeminiMCPPlaygroundState;
  onApproveEscalation: () => void;
  onComplete: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step5Complete({ state, onApproveEscalation, onComplete, onNext, onBack }: Props) {
  const session = state.checkoutSession;
  const order = state.order;
  const needsApproval = state.needsEscalation && !state.escalationToken;
  const readyToComplete = !state.needsEscalation || state.escalationToken;

  return (
    <PlaygroundStepLayout
      title={state.needsEscalation ? "Step 5: Handle Escalation + Complete" : "Step 5: Complete Order"}
      subtitle={
        state.needsEscalation
          ? "The checkout requires buyer approval via Auth0 CIBA. Simulate the approval, then call ucp_checkout_complete."
          : "Call ucp_checkout_complete to finalize the order via MCP."
      }
      rightPanel={
        <RequestResponsePanel
          label="ucp_checkout_complete"
          request={state.requests.complete}
          loading={state.loading && !order}
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
            disabled={!order}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next: Cleanup
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {/* Escalation approval flow */}
      {needsApproval && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4">
            <h3 className="text-sm font-semibold text-amber-700 mb-2">Buyer Approval Required</h3>
            <p className="text-xs text-foreground/40 mb-3">
              The checkout session is in &quot;requires_escalation&quot; state. In production, Auth0 CIBA sends a push
              notification to the buyer&apos;s device. The buyer reviews the order and approves or denies it.
            </p>

            {/* CIBA flow visualization */}
            <div className="p-3 rounded-lg bg-white border border-foreground/[0.06] mb-3">
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-2">Auth0 CIBA Flow</p>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded bg-primary/[0.06] text-primary/70 font-mono">Merchant Server</span>
                <span className="text-foreground/20">&rarr;</span>
                <span className="px-2 py-1 rounded bg-primary/[0.06] text-primary/70 font-mono">Auth0 CIBA</span>
                <span className="text-foreground/20">&rarr;</span>
                <span className="px-2 py-1 rounded bg-primary/[0.06] text-primary/70 font-mono">Push Notification</span>
                <span className="text-foreground/20">&rarr;</span>
                <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-600 font-mono">Buyer Approves</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider">Continue URL</p>
            </div>
            <p className="text-xs font-mono text-foreground/40 bg-foreground/[0.03] px-2 py-1.5 rounded break-all mb-3">
              {session?.continue_url ?? "N/A"}
            </p>

            <button
              onClick={onApproveEscalation}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-500/90 transition-colors cursor-pointer"
            >
              Simulate Buyer Approval (CIBA)
            </button>
          </div>
        </div>
      )}

      {/* Escalation approved, ready to complete */}
      {state.escalationToken && !order && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h3 className="text-sm font-semibold text-emerald-700">Buyer Approved</h3>
            </div>
            <div>
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Escalation Token</p>
              <p className="text-xs font-mono text-foreground/50 bg-foreground/[0.03] px-2 py-1.5 rounded break-all">
                {state.escalationToken}
              </p>
            </div>
          </div>

          <button
            onClick={onComplete}
            disabled={state.loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {state.loading ? "Completing..." : "Complete Checkout via MCP"}
          </button>
        </div>
      )}

      {/* No escalation needed, direct complete */}
      {readyToComplete && !state.escalationToken && !order && !state.needsEscalation && (
        <div className="space-y-4">
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-2">Ready to Complete</h3>
            <p className="text-xs text-foreground/40">
              The checkout session is in &quot;ready_for_complete&quot; state. No escalation needed -- the total is within the agent&apos;s bounded authority.
            </p>
          </div>
          <button
            onClick={onComplete}
            disabled={state.loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {state.loading ? "Completing..." : "Complete Checkout via MCP"}
          </button>
        </div>
      )}

      {/* Order confirmation */}
      {order && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h3 className="text-sm font-semibold text-emerald-700">Order Confirmed</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Order ID</p>
                <p className="text-xs font-mono text-foreground/60">{order.order_id}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Status</p>
                <p className="text-xs font-mono text-emerald-600">{order.status}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Total</p>
                <p className="text-sm font-semibold text-foreground/70">${order.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Buyer</p>
                <p className="text-xs text-foreground/50">{order.buyer_email}</p>
              </div>
            </div>
            {order.items.map((item, i) => (
              <div key={i} className="mt-2 flex items-center justify-between text-xs text-foreground/50">
                <span>{item.quantity}x {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Final state machine */}
          {session && (
            <div className="rounded-lg border border-foreground/[0.06] p-3">
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-2">Final UCP State Machine</p>
              <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
                <span className="px-2 py-0.5 rounded bg-foreground/[0.06] text-foreground/40">incomplete</span>
                <span className="text-foreground/20">&rarr;</span>
                {state.needsEscalation && (
                  <>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600">requires_escalation</span>
                    <span className="text-foreground/20">&rarr;</span>
                  </>
                )}
                <span className="px-2 py-0.5 rounded bg-foreground/[0.06] text-foreground/40">ready_for_complete</span>
                <span className="text-foreground/20">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-semibold">completed</span>
              </div>
            </div>
          )}

          <Auth0Placeholder
            title="End-to-End Auth0 Security"
            description="Auth0 secured this entire flow: OAuth 2.1 authentication, scoped JWT tokens, JWKS validation on every MCP request, bounded authority enforcement, and CIBA escalation for high-value purchases. One authorization server, regardless of transport protocol."
          />
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
