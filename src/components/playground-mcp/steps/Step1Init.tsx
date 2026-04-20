"use client";

import React from "react";
import type { MCPPlaygroundState } from "@/hooks/useMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";
import { Auth0Placeholder } from "../../playground/Auth0Placeholder";

interface Props {
  state: MCPPlaygroundState;
  onInit: () => void;
  onNext: () => void;
}

export function Step1Init({ state, onInit, onNext }: Props) {
  const info = state.serverInfo as Record<string, unknown> | null;
  const result = info?.result as Record<string, unknown> | undefined;
  const serverInfo = result?.serverInfo as Record<string, unknown> | undefined;
  const capabilities = result?.capabilities as Record<string, unknown> | undefined;

  return (
    <PlaygroundStepLayout
      title="Step 1: Initialize Session"
      subtitle="Send a JSON-RPC initialize request to establish an MCP session and get a session ID."
      rightPanel={
        <RequestResponsePanel
          label="Initialize"
          request={state.requests.init}
          loading={state.loading && !state.sessionId}
        />
      }
      footer={
        <>
          <div />
          <button
            onClick={onNext}
            disabled={!state.sessionId}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next: Discover Tools
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
          <button onClick={onInit} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {!state.sessionId && !state.loading && !state.error && (
        <button
          onClick={onInit}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Initialize Session
        </button>
      )}

      {state.loading && !state.sessionId && (
        <div className="flex items-center gap-2 text-sm text-foreground/40">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Establishing MCP session...
        </div>
      )}

      {state.sessionId && (
        <div className="space-y-4">
          {/* Session ID */}
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-2">Session Established</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Mcp-Session-Id</p>
                <p className="text-xs font-mono text-foreground/60 bg-foreground/[0.03] px-2 py-1.5 rounded break-all">
                  {state.sessionId}
                </p>
              </div>

              {serverInfo && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Server</p>
                    <p className="text-sm font-mono text-foreground/60">
                      {serverInfo.name as string ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Version</p>
                    <p className="text-sm font-mono text-foreground/60">
                      {serverInfo.version as string ?? "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {capabilities && (
                <div>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(capabilities).map((cap) => (
                      <span
                        key={cap}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/[0.06] text-primary/70 border border-primary/10"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Auth0Placeholder
            title="OAuth 2.1 Authentication"
            description="In production, this request includes a Bearer token from Auth0. ChatGPT Apps obtain this via OAuth 2.1 + PKCE after the user authenticates through Auth0 Universal Login. This same MCP server is the foundation for OpenAI's Agentic Commerce Protocol (ACP) and Instant Checkout."
          />
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
