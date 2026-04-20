"use client";

import React from "react";
import type { MCPPlaygroundState } from "@/hooks/useMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";

interface Props {
  state: MCPPlaygroundState;
  onCleanup: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function Step5Cleanup({ state, onCleanup, onReset, onBack }: Props) {
  const cleaned = !!state.requests.cleanup;

  return (
    <PlaygroundStepLayout
      title="Step 5: Cleanup"
      subtitle="Close the MCP session by sending a DELETE request. This frees server-side resources."
      rightPanel={
        <RequestResponsePanel
          label="Session Cleanup"
          request={state.requests.cleanup}
          loading={state.loading && !cleaned}
        />
      }
      footer={
        <>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors cursor-pointer"
          >
            Back
          </button>
          <div />
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
          <button onClick={onCleanup} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {!cleaned && !state.loading && (
        <div className="space-y-4">
          {/* Session summary */}
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">Session Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Session ID</p>
                <p className="text-xs font-mono text-foreground/50 truncate">{state.sessionId ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Requests Made</p>
                <p className="text-sm font-semibold text-foreground/60">{state.requestCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Tools Discovered</p>
                <p className="text-sm font-semibold text-foreground/60">{state.tools.length}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onCleanup}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            Close Session
          </button>
        </div>
      )}

      {state.loading && !cleaned && (
        <div className="flex items-center gap-2 text-sm text-foreground/40">
          <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
          Closing session...
        </div>
      )}

      {cleaned && (
        <div className="space-y-4">
          {/* Completion card */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-emerald-700">Session Closed</h3>
            </div>
            <p className="text-xs text-foreground/45 leading-relaxed mb-4">
              The MCP session has been terminated. The server has cleaned up all session-specific
              state. In a production environment, the access token associated with this session
              would also be revoked.
            </p>

            <div className="grid grid-cols-3 gap-4 border-t border-emerald-500/10 pt-3">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Total Requests</p>
                <p className="text-sm font-semibold text-foreground/60">{state.requestCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Tools Found</p>
                <p className="text-sm font-semibold text-foreground/60">{state.tools.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Protocol</p>
                <p className="text-sm font-mono text-foreground/50">2025-03-26</p>
              </div>
            </div>
          </div>

          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Start Over
          </button>
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
