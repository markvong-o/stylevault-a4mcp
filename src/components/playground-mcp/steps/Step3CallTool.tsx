"use client";

import React from "react";
import type { MCPPlaygroundState } from "@/hooks/useMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";
import { CodeBlock } from "@/components/logs/SyntaxHighlight";

interface Props {
  state: MCPPlaygroundState;
  onArgsChange: (args: Record<string, string>) => void;
  onExecute: () => void;
  onNext: () => void;
  onBack: () => void;
}

const DEFAULT_ARGS: Record<string, Record<string, string>> = {
  search_products: { query: "leather" },
  get_product_details: { product_id: "bag_tote_001" },
  get_wishlist: {},
  get_order_history: {},
  update_style_preferences: { preferences: "minimalist, earth tones, quality over quantity" },
  place_order: { product_id: "sneakers_canvas_001", quantity: "1" },
};

export function Step3CallTool({ state, onArgsChange, onExecute, onNext, onBack }: Props) {
  const tool = state.selectedTool;

  if (!tool) {
    return (
      <PlaygroundStepLayout
        title="Step 3: Call a Tool"
        subtitle="No tool selected."
        rightPanel={<div />}
        footer={
          <>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors cursor-pointer"
            >
              Back: Pick a Tool
            </button>
            <div />
          </>
        }
      >
        <p className="text-sm text-foreground/40">Go back to step 2 to select a tool.</p>
      </PlaygroundStepLayout>
    );
  }

  // Extract input schema properties
  const schema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string }>; required?: string[] } | undefined;
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];

  // Initialize defaults if toolArgs is empty
  const defaults = DEFAULT_ARGS[tool.name] ?? {};
  const args = Object.keys(state.toolArgs).length > 0 ? state.toolArgs : defaults;

  const handleArgChange = (key: string, value: string) => {
    onArgsChange({ ...args, [key]: value });
  };

  // Parse tool result for display
  const resultData = state.toolResult as Record<string, unknown> | null;
  const resultContent = resultData?.result as { content?: Array<{ text?: string }> } | undefined;
  const resultText = resultContent?.content?.[0]?.text;

  return (
    <PlaygroundStepLayout
      title="Step 3: Call a Tool"
      subtitle={`Execute ${tool.name} with custom arguments via tools/call.`}
      rightPanel={
        <RequestResponsePanel
          label="Tool Call"
          request={state.requests.toolCall}
          loading={state.loading && !state.toolResult}
        />
      }
      footer={
        <>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors cursor-pointer"
          >
            Back: Pick Another Tool
          </button>
          <button
            onClick={onNext}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Next: Bounded Authority
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
          <button onClick={onExecute} className="ml-2 underline cursor-pointer">Retry</button>
        </div>
      )}

      <div className="space-y-4">
        {/* Tool info */}
        <div className="rounded-lg border border-foreground/[0.06] p-4">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm font-mono font-semibold text-primary">{tool.name}</code>
          </div>
          {tool.description && (
            <p className="text-xs text-foreground/40">{tool.description}</p>
          )}
        </div>

        {/* Arguments form */}
        {Object.keys(properties).length > 0 && (
          <div className="rounded-lg border border-foreground/[0.06] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground/70">Arguments</h3>
            {Object.entries(properties).map(([key, prop]) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-mono text-foreground/55">{key}</span>
                  {required.includes(key) && (
                    <span className="text-[9px] text-red-400">required</span>
                  )}
                  {prop.type && (
                    <span className="text-[9px] text-foreground/25">{prop.type}</span>
                  )}
                </label>
                {prop.description && (
                  <p className="text-[11px] text-foreground/30 mb-1">{prop.description}</p>
                )}
                <input
                  type="text"
                  value={args[key] ?? ""}
                  onChange={(e) => handleArgChange(key, e.target.value)}
                  placeholder={key}
                  className="w-full text-xs font-mono px-3 py-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.02] text-foreground/60 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                />
              </div>
            ))}
          </div>
        )}

        {/* Execute button */}
        <button
          onClick={() => {
            // Set the args first if using defaults
            if (Object.keys(state.toolArgs).length === 0 && Object.keys(defaults).length > 0) {
              onArgsChange(defaults);
            }
            onExecute();
          }}
          disabled={state.loading}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {state.loading ? "Executing..." : "Execute Tool"}
        </button>

        {/* Result */}
        {resultText && (
          <div className="rounded-lg border border-foreground/[0.06] p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-2">Result</h3>
            <div className="max-h-[300px] overflow-y-auto">
              <CodeBlock code={resultText} />
            </div>
          </div>
        )}
      </div>
    </PlaygroundStepLayout>
  );
}
