"use client";

import React from "react";
import type { PlaygroundState } from "@/hooks/usePlaygroundState";
import { PlaygroundStepLayout } from "../PlaygroundStepLayout";
import { Auth0Placeholder } from "../Auth0Placeholder";

interface Props {
  state: PlaygroundState;
  onSimulateApproval: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4Escalation({ state, onSimulateApproval, onNext, onBack }: Props) {
  const session = state.checkoutSession;
  const hasToken = !!state.escalationToken;

  return (
    <PlaygroundStepLayout
      title="Step 4: Buyer Approval"
      subtitle="The checkout total exceeds the $250 agent limit. Buyer approval is required before the transaction can complete."
      rightPanel={
        <div className="rounded-xl border border-foreground/[0.06] bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-foreground/[0.05]">
            <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">Escalation Flow</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            {/* Flow visualization */}
            {[
              { label: "Agent requests checkout", detail: `$${session?.total.toFixed(2)} > $250 limit`, done: true },
              { label: "Server returns requires_escalation", detail: `continue_url provided`, done: true },
              { label: "Auth0 CIBA sends push notification", detail: "Buyer's device notified", done: hasToken },
              { label: "Buyer approves transaction", detail: "Escalation token issued", done: hasToken },
              { label: "Agent completes with token", detail: "X-UCP-Escalation-Token header", done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                    step.done
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-foreground/[0.06] text-foreground/25"
                  }`}>
                    {step.done ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < 4 && <div className={`w-px h-4 ${step.done ? "bg-emerald-500/30" : "bg-foreground/[0.06]"}`} />}
                </div>
                <div className="pb-1">
                  <p className={`text-xs font-medium ${step.done ? "text-foreground/60" : "text-foreground/30"}`}>{step.label}</p>
                  <p className="text-[10px] text-foreground/25">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
      footer={
        <>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.03] border border-foreground/[0.08] transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!hasToken}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next: Complete Checkout
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Auth0 CIBA placeholder */}
        <Auth0Placeholder
          variant="action"
          title="Auth0 CIBA (Client-Initiated Backchannel Authentication)"
          description="In production, RetailZero calls Auth0's /bc-authorize endpoint with the buyer's email. Auth0 sends a push notification to the buyer's device via Auth0 Guardian. The buyer reviews and approves the transaction. Auth0 issues an escalation token that proves the buyer consented to this specific checkout session."
        />

        {/* Session context */}
        {session && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-xs font-semibold text-amber-700">Escalation Required</span>
            </div>
            <div className="space-y-1 text-xs text-foreground/50">
              <p><span className="text-foreground/35">Session:</span> <code className="font-mono">{session.session_id}</code></p>
              <p><span className="text-foreground/35">Amount:</span> <span className="font-mono font-semibold">${session.total.toFixed(2)}</span></p>
              <p><span className="text-foreground/35">Agent limit:</span> <span className="font-mono">$250.00</span></p>
              <p><span className="text-foreground/35">Continue URL:</span> <code className="font-mono text-[11px] break-all">{session.continue_url}</code></p>
            </div>
          </div>
        )}

        {/* Simulate approval button */}
        {!hasToken ? (
          <button
            onClick={onSimulateApproval}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
          >
            Simulate Buyer Approval
          </button>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <span className="text-xs font-semibold text-emerald-700">Buyer Approved</span>
            </div>
            <p className="text-xs text-foreground/40">
              Escalation token: <code className="font-mono text-[11px] text-foreground/50">{state.escalationToken}</code>
            </p>
            <p className="text-[11px] text-foreground/30 mt-1">
              This token will be sent as the X-UCP-Escalation-Token header when completing checkout.
            </p>
          </div>
        )}
      </div>
    </PlaygroundStepLayout>
  );
}
