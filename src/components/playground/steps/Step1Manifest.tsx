"use client";

import React, { useEffect } from "react";
import type { PlaygroundState } from "@/hooks/usePlaygroundState";
import { PlaygroundStepLayout } from "../PlaygroundStepLayout";
import { RequestResponsePanel } from "../RequestResponsePanel";

interface Props {
  state: PlaygroundState;
  onFetch: () => void;
  onNext: () => void;
}

export function Step1Manifest({ state, onFetch, onNext }: Props) {
  // Auto-fetch on mount
  useEffect(() => {
    if (!state.manifest && !state.loading) {
      onFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manifest = state.manifest as Record<string, unknown> | null;

  // capabilities is an object keyed by name, each with { versions, endpoints, ... }
  const capabilitiesObj = manifest?.capabilities as Record<string, { versions?: string[] }> | undefined;
  const capabilities = capabilitiesObj
    ? Object.entries(capabilitiesObj).map(([name, val]) => ({ name, version: val.versions?.[0] ?? "1.0.0" }))
    : undefined;

  // payment handlers live under payment.handlers
  const paymentObj = manifest?.payment as { handlers?: Array<{ id: string; display_name: string }> } | undefined;
  const paymentHandlers = paymentObj?.handlers;

  return (
    <PlaygroundStepLayout
      title="Step 1: Discover Merchant Manifest"
      subtitle="Fetch the UCP manifest from /.well-known/ucp to learn what this merchant supports."
      rightPanel={
        <RequestResponsePanel
          label="Manifest Discovery"
          request={state.requests.manifest}
          loading={state.loading && !state.manifest}
        />
      }
      footer={
        <>
          <div />
          <button
            onClick={onNext}
            disabled={!state.manifest}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next: Browse Catalog
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
          <button onClick={onFetch} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {!state.manifest && !state.loading && !state.error && (
        <button
          onClick={onFetch}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Fetch Manifest
        </button>
      )}

      {manifest && (
        <div className="space-y-4">
          {/* Merchant info */}
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-2">Merchant</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Name</p>
                <p className="text-sm font-mono text-foreground/60">{manifest.name as string ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Description</p>
                <p className="text-sm text-foreground/60">{manifest.description as string ?? "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          {capabilities && (
            <div className="rounded-lg border border-foreground/[0.06] p-4">
              <h3 className="text-sm font-semibold text-foreground/70 mb-2">
                Capabilities ({capabilities.length})
              </h3>
              <div className="space-y-1.5">
                {capabilities.map((cap) => (
                  <div key={cap.name} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <code className="text-xs font-mono text-foreground/55">{cap.name}</code>
                    <span className="text-[10px] text-foreground/30">v{cap.version}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment handlers */}
          {paymentHandlers && (
            <div className="rounded-lg border border-foreground/[0.06] p-4">
              <h3 className="text-sm font-semibold text-foreground/70 mb-2">Payment Handlers</h3>
              <div className="flex gap-2">
                {paymentHandlers.map((ph) => (
                  <span key={ph.id} className="text-xs font-mono px-2 py-1 rounded bg-foreground/[0.04] text-foreground/50 border border-foreground/[0.06]">
                    {ph.display_name ?? ph.id}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onFetch}
            className="text-xs text-foreground/35 hover:text-foreground/55 transition-colors cursor-pointer"
          >
            Re-fetch
          </button>
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
