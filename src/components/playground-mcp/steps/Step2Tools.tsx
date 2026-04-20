"use client";

import React, { useEffect } from "react";
import type { MCPPlaygroundState, Tool } from "@/hooks/useMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";

interface Props {
  state: MCPPlaygroundState;
  onFetchTools: () => void;
  onSelectTool: (tool: Tool) => void;
  onBack: () => void;
}

const SCOPE_MAP: Record<string, string> = {
  search_products: "read:products",
  get_product_details: "read:products",
  get_wishlist: "read:wishlist",
  get_order_history: "read:orders",
  update_style_preferences: "write:preferences",
  place_order: "execute:purchase",
};

export function Step2Tools({ state, onFetchTools, onSelectTool, onBack }: Props) {
  // Auto-fetch tools on mount
  useEffect(() => {
    if (state.tools.length === 0 && !state.loading && state.sessionId) {
      onFetchTools();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PlaygroundStepLayout
      title="Step 2: Discover Tools"
      subtitle="Query the server's available tools via tools/list. Click a tool to try it in the next step."
      rightPanel={
        <RequestResponsePanel
          label="Tools List"
          request={state.requests.tools}
          loading={state.loading && state.tools.length === 0}
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
          <button onClick={onFetchTools} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      {state.tools.length === 0 && !state.loading && !state.error && (
        <button
          onClick={onFetchTools}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Fetch Tools
        </button>
      )}

      {state.tools.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-foreground/40">
            {state.tools.length} tools registered. Click one to execute it.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {state.tools.map((tool) => {
              const scope = SCOPE_MAP[tool.name];
              return (
                <button
                  key={tool.name}
                  onClick={() => onSelectTool(tool)}
                  className="text-left rounded-lg border border-foreground/[0.06] p-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-semibold text-foreground/70 group-hover:text-primary transition-colors">
                      {tool.name}
                    </code>
                    {scope && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/[0.04] text-foreground/35 border border-foreground/[0.06]">
                        {scope}
                      </span>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-xs text-foreground/40 line-clamp-2">
                      {tool.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
