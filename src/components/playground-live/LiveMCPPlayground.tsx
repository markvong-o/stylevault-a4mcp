"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLiveMCPState, type Tool } from "@/hooks/useLiveMCPState";
import { LogEventCard, type McpLogEvent } from "@/components/logs/LogEventCard";
import { CodeBlock } from "@/components/logs/SyntaxHighlight";

/* ------------------------------------------------------------------ */
/*  Scope metadata for UI badges                                       */
/* ------------------------------------------------------------------ */

const TOOL_SCOPES: Record<string, string> = {
  get_wishlist: "read:wishlist",
  add_to_wishlist: "write:wishlist",
  remove_from_wishlist: "write:wishlist",
  get_recommendations: "read:wishlist + read:orders",
  get_order_history: "read:orders",
  place_order: "execute:purchase",
  update_preferences: "write:preferences",
};

const RELEVANT_TYPES = new Set([
  "session-init",
  "token-verified",
  "token-issued",
  "token-rejected",
  "tool-list",
  "tool-call",
  "tool-result",
]);

/* ------------------------------------------------------------------ */
/*  Live Event Log (right panel)                                       */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL = 2000;

function LiveEventLog() {
  const [events, setEvents] = useState<McpLogEvent[]>([]);
  const [status, setStatus] = useState<"polling" | "connected" | "error">("polling");
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const incoming: McpLogEvent[] = data.events || [];

        const fresh = incoming.filter(
          (e) => !seenRef.current.has(e.id) && RELEVANT_TYPES.has(e.type)
        );
        if (fresh.length > 0) {
          for (const e of fresh) seenRef.current.add(e.id);
          setEvents((prev) => {
            const existing = new Set(prev.map((e) => e.id));
            const newEvents = fresh.filter((e) => !existing.has(e.id));
            return newEvents.length > 0 ? [...prev, ...newEvents] : prev;
          });
        }
        setStatus("connected");
      } catch {
        setStatus("error");
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [events.length]);

  const handleClear = () => {
    setEvents([]);
    seenRef.current = new Set();
    fetch("/api/events", { method: "DELETE" }).catch(() => {});
  };

  const statusColor = status === "connected" ? "bg-emerald-400" : status === "polling" ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-foreground/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor} ${status === "polling" ? "animate-pulse" : ""}`} />
          <span className="text-xs font-medium text-foreground/50">Event Stream</span>
          <span className="text-[10px] text-foreground/25 font-mono">{events.length} events</span>
        </div>
        <button
          onClick={handleClear}
          className="text-[10px] px-2 py-1 rounded border border-foreground/[0.06] text-foreground/30 hover:text-foreground/50 transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>

      {/* Events */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-foreground/20 text-xs">Initialize a session to see events here</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event, i) => (
              <div
                key={event.id}
                className={(event.type as string) === "token-issued" ? "ring-1 ring-amber-400/30 rounded-lg" : ""}
              >
                <LogEventCard event={event} isLatest={i === events.length - 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool Card                                                          */
/* ------------------------------------------------------------------ */

function ToolCard({
  tool,
  isSelected,
  onSelect,
}: {
  tool: Tool;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const scope = TOOL_SCOPES[tool.name];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-foreground/[0.06] hover:border-foreground/[0.12] hover:bg-foreground/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground/80">{tool.name}</span>
        {scope && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-mono">
            {scope}
          </span>
        )}
      </div>
      {tool.description && (
        <p className="text-[11px] text-foreground/40 mt-1 line-clamp-2">{tool.description}</p>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool Input Form                                                    */
/* ------------------------------------------------------------------ */

function ToolInputForm({
  tool,
  args,
  onArgsChange,
  onCall,
  loading,
}: {
  tool: Tool;
  args: Record<string, string>;
  onArgsChange: (args: Record<string, string>) => void;
  onCall: () => void;
  loading: boolean;
}) {
  const rawSchema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string }> } | undefined;
  const fields = rawSchema?.properties ? Object.entries(rawSchema.properties) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">{tool.name}</h3>
        {TOOL_SCOPES[tool.name] && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-mono">
            requires {TOOL_SCOPES[tool.name]}
          </span>
        )}
      </div>

      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map(([name, config]) => (
            <div key={name}>
              <label className="text-[11px] text-foreground/40 font-mono block mb-1">{name}</label>
              <input
                type="text"
                value={args[name] || ""}
                onChange={(e) => onArgsChange({ ...args, [name]: e.target.value })}
                placeholder={config?.description || name}
                className="w-full text-sm px-3 py-1.5 rounded-md border border-foreground/[0.08] bg-foreground/[0.02] text-foreground/80 placeholder:text-foreground/20 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-foreground/30">No input parameters required.</p>
      )}

      <button
        onClick={onCall}
        disabled={loading}
        className="w-full py-2 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Calling...
          </span>
        ) : (
          "Call Tool"
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface LiveMCPPlaygroundProps {
  accessToken: string;
  user: { sub: string; name?: string; email?: string; picture?: string };
}

export function LiveMCPPlayground({ accessToken, user }: LiveMCPPlaygroundProps) {
  const { state, selectTool, setToolArgs, reset, initSession, callTool } = useLiveMCPState(accessToken);

  const handleCallTool = () => {
    if (!state.selectedTool) return;
    // Convert string args to appropriate types
    const typedArgs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state.toolArgs)) {
      if (!v) continue;
      // Try to parse as number
      const num = Number(v);
      if (!isNaN(num) && v.trim() !== "") {
        typedArgs[k] = num;
      } else {
        typedArgs[k] = v;
      }
    }
    callTool(state.selectedTool.name, typedArgs);
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left panel: Tool interaction */}
      <div className="flex-1 flex flex-col border-r border-foreground/[0.06] min-w-0">
        {/* Header */}
        <header className="shrink-0 px-6 py-4 border-b border-foreground/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground/80">Live MCP Playground</h1>
              <p className="text-[11px] text-foreground/30 mt-0.5">
                Authenticated tool calls with real-time token exchange
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user.picture && (
                <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
              )}
              <span className="text-xs text-foreground/40">{user.email || user.sub}</span>
              {state.sessionId && (
                <button
                  onClick={reset}
                  className="text-[10px] px-2 py-1 rounded border border-foreground/[0.06] text-foreground/30 hover:text-foreground/50 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {!state.sessionId ? (
            /* Step 1: Initialize */
            <div className="max-w-md mx-auto text-center mt-16">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-foreground/70 mb-2">Start a Session</h2>
              <p className="text-sm text-foreground/40 mb-6">
                Initialize an MCP session with your access token. The event stream on the right
                will show each authentication step in real time.
              </p>
              <button
                onClick={initSession}
                disabled={state.loading}
                className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {state.loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Initializing...
                  </span>
                ) : (
                  "Initialize Session"
                )}
              </button>
              {state.error && (
                <p className="text-xs text-red-500 mt-3">{state.error}</p>
              )}
            </div>
          ) : (
            /* Step 2: Tool selection + execution */
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono">
                  session active
                </span>
                <span className="text-[10px] text-foreground/25 font-mono">{state.sessionId}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Tool list */}
                <div>
                  <h2 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">
                    Available Tools ({state.tools.length})
                  </h2>
                  <div className="space-y-2">
                    {state.tools.map((tool) => (
                      <ToolCard
                        key={tool.name}
                        tool={tool}
                        isSelected={state.selectedTool?.name === tool.name}
                        onSelect={() => selectTool(tool)}
                      />
                    ))}
                  </div>
                </div>

                {/* Call form + result */}
                <div className="flex justify-center">
                  {state.selectedTool ? (
                    <div className="space-y-4 w-full max-w-[515px]">
                      <ToolInputForm
                        tool={state.selectedTool}
                        args={state.toolArgs}
                        onArgsChange={setToolArgs}
                        onCall={handleCallTool}
                        loading={state.loading}
                      />

                      {state.error && (
                        <p className="text-xs text-red-500">{state.error}</p>
                      )}

                      {state.toolResult != null && (
                        <div>
                          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2">
                            Result
                          </h3>
                          <div className="max-h-[500px] overflow-auto rounded-lg border border-foreground/[0.06]">
                            <CodeBlock code={JSON.stringify(state.toolResult, null, 2)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-foreground/20 text-sm">
                      Select a tool to get started
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Live event log */}
      <div className="w-[593px] shrink-0 bg-foreground/[0.01]">
        <LiveEventLog />
      </div>
    </div>
  );
}
