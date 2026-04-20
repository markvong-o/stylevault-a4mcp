"use client";

import React from "react";
import type { PlaygroundState } from "@/hooks/usePlaygroundState";
import { PlaygroundStepLayout } from "../PlaygroundStepLayout";
import { RequestResponsePanel } from "../RequestResponsePanel";

interface Props {
  state: PlaygroundState;
  onComplete: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function Step5Complete({ state, onComplete, onReset, onBack }: Props) {
  const session = state.checkoutSession;
  const order = state.order;

  // Show the complete request, or the order request once we have both
  const activeRequest = state.requests.order ?? state.requests.complete;
  const activeLabel = state.requests.order ? "Order Confirmation" : "Complete Checkout";

  return (
    <PlaygroundStepLayout
      title="Step 5: Complete Checkout"
      subtitle={order ? "Transaction complete. Here are the order details." : "Finalize the checkout session and create the order."}
      rightPanel={
        <div className="space-y-4">
          {/* Complete request */}
          <RequestResponsePanel
            label="Complete Checkout"
            request={state.requests.complete}
            loading={state.loading && !order}
          />
          {/* Order fetch request */}
          {state.requests.order && (
            <RequestResponsePanel
              label="Order Confirmation"
              request={state.requests.order}
            />
          )}
        </div>
      }
      footer={
        <>
          {!order ? (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.03] border border-foreground/[0.08] transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          {order ? (
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Start Over
            </button>
          ) : (
            <div />
          )}
        </>
      }
    >
      <div className="space-y-4">
        {state.error && (
          <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
            {state.error}
          </div>
        )}

        {/* Pre-completion: session summary */}
        {!order && session && (
          <>
            <div className="rounded-lg border border-foreground/[0.06] p-4">
              <h3 className="text-sm font-semibold text-foreground/70 mb-3">Session Summary</h3>
              <div className="space-y-1.5 text-xs">
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
                {state.escalationToken && (
                  <p className="text-foreground/50">
                    <span className="text-foreground/35">Escalation Token:</span>{" "}
                    <code className="font-mono text-[11px]">{state.escalationToken}</code>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onComplete}
              disabled={state.loading}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {state.loading ? "Completing..." : "Complete Checkout"}
            </button>
          </>
        )}

        {/* Post-completion: order details */}
        {order && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <span className="text-base font-semibold text-emerald-700">Order Confirmed</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Order ID</p>
                  <p className="text-sm font-mono text-foreground/60">{order.order_id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Status</p>
                  <p className="text-sm text-foreground/60 capitalize">{order.status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Total</p>
                  <p className="text-sm font-mono font-semibold text-foreground/70">${order.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Buyer</p>
                  <p className="text-sm text-foreground/60">{order.buyer_email}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1.5">Items</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-foreground/60">{item.name} x{item.quantity}</span>
                    <span className="font-mono text-foreground/50">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Shipment */}
              {order.shipment && (
                <div>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1.5">Shipment</p>
                  <div className="text-xs text-foreground/50 space-y-0.5">
                    <p>Status: {order.shipment.status}</p>
                    {order.shipment.carrier && <p>Carrier: {order.shipment.carrier}</p>}
                    {order.shipment.tracking_number && <p>Tracking: <code className="font-mono">{order.shipment.tracking_number}</code></p>}
                    {order.shipment.estimated_delivery && <p>Estimated delivery: {order.shipment.estimated_delivery}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PlaygroundStepLayout>
  );
}
