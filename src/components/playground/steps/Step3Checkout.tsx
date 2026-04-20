"use client";

import React from "react";
import type { PlaygroundState } from "@/hooks/usePlaygroundState";
import { PlaygroundStepLayout } from "../PlaygroundStepLayout";
import { RequestResponsePanel } from "../RequestResponsePanel";

interface Props {
  state: PlaygroundState;
  onQuantityChange: (q: number) => void;
  onCreate: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Checkout({ state, onQuantityChange, onCreate, onNext, onBack }: Props) {
  const product = state.selectedProduct;
  const session = state.checkoutSession;
  const total = product ? product.price * state.quantity : 0;

  return (
    <PlaygroundStepLayout
      title="Step 3: Create Checkout Session"
      subtitle="Submit a checkout request. The server enforces a $250 bounded authority limit for agent-initiated transactions."
      rightPanel={
        <RequestResponsePanel
          label="Checkout Session"
          request={state.requests.checkout}
          loading={state.loading && !session}
        />
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
            disabled={!session}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {state.needsEscalation ? "Next: Buyer Approval" : "Next: Complete Checkout"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {state.error && (
          <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
            {state.error}
          </div>
        )}

        {/* Product + quantity */}
        {product && (
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">Order Summary</h3>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-foreground/70">{product.name}</p>
                <p className="text-xs text-foreground/35 capitalize">{product.category}</p>
              </div>
              <span className="text-sm font-mono font-semibold text-foreground/60">${product.price.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-foreground/40">Quantity:</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQuantityChange(state.quantity - 1)}
                  disabled={state.quantity <= 1}
                  className="w-7 h-7 rounded border border-foreground/[0.1] text-foreground/40 hover:text-foreground/60 disabled:opacity-30 cursor-pointer text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-mono text-foreground/60">{state.quantity}</span>
                <button
                  onClick={() => onQuantityChange(state.quantity + 1)}
                  className="w-7 h-7 rounded border border-foreground/[0.1] text-foreground/40 hover:text-foreground/60 cursor-pointer text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-foreground/[0.06]">
              <span className="text-sm text-foreground/50">Total</span>
              <span className={`text-base font-semibold font-mono ${total > 250 ? "text-amber-600" : "text-foreground/70"}`}>
                ${total.toFixed(2)}
              </span>
            </div>

            {total > 250 && (
              <p className="text-[11px] text-amber-600/80 mt-1.5">
                Exceeds $250 agent limit. This will trigger escalation.
              </p>
            )}
          </div>
        )}

        {/* Create button */}
        {!session && (
          <button
            onClick={onCreate}
            disabled={state.loading || !product}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {state.loading ? "Creating session..." : "Create Checkout Session"}
          </button>
        )}

        {/* Session result */}
        {session && (
          <div className={`rounded-lg border p-4 ${
            state.needsEscalation
              ? "border-amber-500/30 bg-amber-500/[0.04]"
              : "border-emerald-500/30 bg-emerald-500/[0.04]"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {state.needsEscalation ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              )}
              <span className={`text-sm font-semibold ${state.needsEscalation ? "text-amber-700" : "text-emerald-700"}`}>
                {state.needsEscalation ? "Escalation Required" : "Ready to Complete"}
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <p className="text-foreground/50">
                <span className="text-foreground/35">Session:</span>{" "}
                <code className="font-mono">{session.session_id}</code>
              </p>
              <p className="text-foreground/50">
                <span className="text-foreground/35">Status:</span>{" "}
                <code className="font-mono">{session.status}</code>
              </p>
              <p className="text-foreground/50">
                <span className="text-foreground/35">Total:</span>{" "}
                <span className="font-mono font-semibold">${session.total.toFixed(2)}</span>
              </p>
              {session.continue_url && (
                <p className="text-foreground/50">
                  <span className="text-foreground/35">Continue URL:</span>{" "}
                  <code className="font-mono text-[11px] break-all">{session.continue_url}</code>
                </p>
              )}
              {session.messages.length > 0 && (
                <p className="text-amber-600/80 mt-1">{session.messages[0].text}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </PlaygroundStepLayout>
  );
}
