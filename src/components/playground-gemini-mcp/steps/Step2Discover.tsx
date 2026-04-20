"use client";

import React, { useEffect } from "react";
import type { GeminiMCPPlaygroundState } from "@/hooks/useGeminiMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";

interface Props {
  state: GeminiMCPPlaygroundState;
  onDiscover: () => void;
  onListTools: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Discover({ state, onDiscover, onListTools, onNext, onBack }: Props) {
  const manifest = state.ucpManifest;
  const capabilities = manifest?.capabilities as Record<string, unknown> | undefined;

  // Auto-discover on mount if not already fetched
  useEffect(() => {
    if (!manifest && !state.loading && state.sessionId) {
      onDiscover();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-list tools after manifest is loaded
  useEffect(() => {
    if (manifest && state.tools.length === 0 && !state.loading && state.sessionId) {
      onListTools();
    }
  }, [manifest]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PlaygroundStepLayout
      title="Step 2: Discover UCP Capabilities"
      subtitle="Call the ucp_discover tool to retrieve the merchant's UCP manifest. This is the equivalent of GET /.well-known/ucp, but delivered over MCP."
      rightPanel={
        <RequestResponsePanel
          label="ucp_discover"
          request={state.requests.discover}
          loading={state.loading && !manifest}
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
            disabled={!manifest}
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
          <button onClick={onDiscover} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {state.loading && !manifest && (
        <div className="flex items-center gap-2 text-sm text-foreground/40">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Calling ucp_discover tool...
        </div>
      )}

      {manifest && (
        <div className="space-y-4">
          {/* Manifest overview */}
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground/70">UCP Manifest</h3>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#4285f4]/10 text-[#4285f4] border border-[#4285f4]/15">
                via MCP Transport
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Merchant</p>
                <p className="text-sm text-foreground/60">{manifest.name as string}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Transport</p>
                <p className="text-sm font-mono text-foreground/60">
                  {(manifest.ucp as Record<string, unknown>)?.transport as string ?? "mcp"}
                </p>
              </div>
            </div>

            <p className="text-xs text-foreground/40">{manifest.description as string}</p>
          </div>

          {/* Capabilities */}
          {capabilities && (
            <div className="rounded-lg border border-foreground/[0.06] p-4">
              <h3 className="text-sm font-semibold text-foreground/70 mb-3">UCP Capabilities</h3>
              <div className="space-y-3">
                {Object.entries(capabilities).map(([key, value]) => {
                  const cap = value as Record<string, unknown>;
                  const mcpTools = cap.mcp_tools as string[] | undefined;
                  return (
                    <div key={key} className="p-3 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
                      <p className="text-xs font-mono font-semibold text-foreground/60 mb-1">{key}</p>
                      {mcpTools && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {mcpTools.map((tool) => (
                            <span
                              key={tool}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/[0.06] text-primary/70 border border-primary/10"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                      {Array.isArray(cap.state_machine) && (
                        <div className="mt-2">
                          <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">State Machine</p>
                          <div className="space-y-0.5">
                            {(cap.state_machine as string[]).map((transition, i) => (
                              <p key={i} className="text-[10px] font-mono text-foreground/40">{transition}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {cap.bounded_authority != null && (
                        <div className="mt-2">
                          <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">Bounded Authority</p>
                          <p className="text-[10px] font-mono text-amber-600">
                            Max: ${String((cap.bounded_authority as Record<string, unknown>).max_agent_purchase)} | Escalation: {String((cap.bounded_authority as Record<string, unknown>).escalation)}
                          </p>
                        </div>
                      )}
                      {cap.auth != null && (
                        <div className="mt-2">
                          <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">Auth</p>
                          <p className="text-[10px] font-mono text-foreground/40">
                            {String((cap.auth as Record<string, unknown>).authorization_server)} ({String((cap.auth as Record<string, unknown>).protocol)})
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MCP Tools listing */}
          {state.tools.length > 0 && (
            <div className="rounded-lg border border-foreground/[0.06] p-4">
              <h3 className="text-sm font-semibold text-foreground/70 mb-3">MCP Tools (UCP Commerce)</h3>
              <div className="grid grid-cols-2 gap-2">
                {state.tools.map((tool) => (
                  <div key={tool.name} className="p-2.5 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
                    <p className="text-[11px] font-mono font-semibold text-primary/70">{tool.name}</p>
                    {tool.description && (
                      <p className="text-[10px] text-foreground/35 mt-0.5 line-clamp-2">{tool.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
