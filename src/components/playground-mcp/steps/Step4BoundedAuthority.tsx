"use client";

import React from "react";
import type { MCPPlaygroundState } from "@/hooks/useMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";
import { Auth0Placeholder } from "../../playground/Auth0Placeholder";
import { CodeBlock } from "@/components/logs/SyntaxHighlight";

interface Props {
  state: MCPPlaygroundState;
  onRun: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4BoundedAuthority({ state, onRun, onNext, onBack }: Props) {
  const rejectedResult = state.boundedAuthorityResult as Record<string, unknown> | null;
  const successResult = state.boundedAuthoritySuccessResult as Record<string, unknown> | null;

  // Show the rejected request in right panel by default, switch to success if rejection is done
  const activeRequest = state.requests.boundedAuthoritySuccess ?? state.requests.boundedAuthority;

  return (
    <PlaygroundStepLayout
      title="Step 4: Bounded Authority"
      subtitle="See what happens when an AI agent tries to exceed its spending limit. The server enforces a $250 cap on autonomous purchases."
      rightPanel={
        <RequestResponsePanel
          label="Bounded Authority"
          request={activeRequest}
          loading={state.loading && !rejectedResult}
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
          <button
            onClick={onNext}
            disabled={!rejectedResult}
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
          <button onClick={onRun} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      <div className="space-y-4">
        {/* Explanation */}
        <div className="rounded-lg border border-foreground/[0.06] p-4">
          <h3 className="text-sm font-semibold text-foreground/70 mb-2">What this demonstrates</h3>
          <p className="text-xs text-foreground/45 leading-relaxed">
            The MCP server enforces a $250 maximum on autonomous agent purchases. When an agent
            tries to order the Meridian Automatic Watch ($2,400), the server rejects the request.
            A second order for Canvas Sneakers ($89) goes through successfully.
          </p>
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-md bg-red-500/[0.04] border border-red-500/15 px-3 py-2">
              <p className="text-[10px] text-red-500/60 uppercase tracking-wider font-semibold mb-0.5">Rejected</p>
              <p className="text-xs font-mono text-foreground/55">Meridian Watch - $2,400</p>
            </div>
            <div className="flex-1 rounded-md bg-emerald-500/[0.04] border border-emerald-500/15 px-3 py-2">
              <p className="text-[10px] text-emerald-500/60 uppercase tracking-wider font-semibold mb-0.5">Approved</p>
              <p className="text-xs font-mono text-foreground/55">Canvas Sneakers - $89</p>
            </div>
          </div>
        </div>

        {/* Run button */}
        {!rejectedResult && !state.loading && (
          <button
            onClick={onRun}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Run Bounded Authority Demo
          </button>
        )}

        {state.loading && !rejectedResult && (
          <div className="flex items-center gap-2 text-sm text-foreground/40">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Placing orders...
          </div>
        )}

        {/* Rejection result */}
        {rejectedResult && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="text-sm font-semibold text-red-600">Order Rejected - Over $250 Limit</h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <CodeBlock code={JSON.stringify(rejectedResult, null, 2)} />
            </div>
          </div>
        )}

        {/* Success result */}
        {successResult && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-emerald-600">Order Approved - Under $250 Limit</h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <CodeBlock code={JSON.stringify(successResult, null, 2)} />
            </div>
          </div>
        )}

        {/* Auth0 placeholder */}
        {rejectedResult && (
          <Auth0Placeholder
            title="CIBA Escalation"
            description="In production, when an order exceeds the agent's spending limit, Auth0 CIBA sends a push notification to the buyer's device. After the buyer approves, the agent retries with an escalation token that grants temporary elevated authority."
            variant="action"
          />
        )}
      </div>
    </PlaygroundStepLayout>
  );
}
