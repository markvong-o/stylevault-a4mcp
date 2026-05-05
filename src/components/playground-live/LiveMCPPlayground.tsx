"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
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
/*  Column layout types                                                */
/* ------------------------------------------------------------------ */

type ColumnId = "tools" | "center" | "log";

type ColumnControls = {
  collapsed: boolean;
  onToggle: () => void;
  onMaximize: () => void;
};

function ColumnHeaderControls({ controls }: { controls: ColumnControls }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={controls.onMaximize}
        title="Maximize (collapse other columns)"
        className="p-1 text-foreground/30 hover:text-foreground/70 hover:bg-foreground/[0.04] rounded transition-colors cursor-pointer"
      >
        <Maximize2 size={12} />
      </button>
      <button
        onClick={controls.onToggle}
        title="Minimize"
        className="p-1 text-foreground/30 hover:text-foreground/70 hover:bg-foreground/[0.04] rounded transition-colors cursor-pointer"
      >
        <Minimize2 size={12} />
      </button>
    </div>
  );
}

function CollapsedStrip({
  label,
  onExpand,
  side,
}: {
  label: string;
  onExpand: () => void;
  side: "left" | "right";
}) {
  const borderClass =
    side === "left"
      ? "border-l border-foreground/[0.06]"
      : "border-r border-foreground/[0.06]";
  return (
    <div
      className={`w-10 shrink-0 h-full flex flex-col items-center py-3 gap-3 bg-foreground/[0.015] ${borderClass}`}
    >
      <button
        onClick={onExpand}
        title="Expand"
        className="p-1 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06] rounded transition-colors cursor-pointer"
      >
        <Maximize2 size={12} />
      </button>
      <span className="text-[10px] text-foreground/40 uppercase tracking-wider [writing-mode:vertical-rl] mt-1">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Event Log (right panel)                                       */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL = 2000;

function LiveEventLog({
  accessToken,
  controls,
}: {
  accessToken: string | null;
  controls: ColumnControls;
}) {
  const [events, setEvents] = useState<McpLogEvent[]>([]);
  const [status, setStatus] = useState<"polling" | "connected" | "error">("polling");
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const poll = async () => {
      if (!accessToken) {
        setStatus("polling");
        return;
      }
      try {
        const res = await fetch("/api/events", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
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
  }, [accessToken]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [events.length]);

  const handleClear = () => {
    setEvents([]);
    seenRef.current = new Set();
    if (!accessToken) return;
    fetch("/api/events", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  };

  if (controls.collapsed) {
    return <CollapsedStrip label="Event Stream" onExpand={controls.onToggle} side="left" />;
  }

  const statusColor = status === "connected" ? "bg-emerald-400" : status === "polling" ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex-1 basis-0 min-w-[260px] shrink flex flex-col border-l border-foreground/[0.06] bg-foreground/[0.01]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-foreground/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor} ${status === "polling" ? "animate-pulse" : ""}`} />
          <span className="text-xs font-medium text-foreground/50 shrink-0">Event Stream</span>
          <span className="text-[10px] text-foreground/25 font-mono truncate">{events.length} events</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClear}
            className="text-[10px] px-2 py-1 rounded border border-foreground/[0.06] text-foreground/30 hover:text-foreground/50 transition-colors cursor-pointer"
          >
            Clear
          </button>
          <ColumnHeaderControls controls={controls} />
        </div>
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
/*  Result unwrapping + formatting                                     */
/* ------------------------------------------------------------------ */

/**
 * MCP tool calls return a JSON-RPC envelope:
 *   { jsonrpc, id, result: { content: [{ type: "text", text: "<json string>" }], structuredContent? } }
 * Prefer structuredContent, then parsed content[0].text, then the raw envelope.
 */
function unwrapToolResult(raw: unknown): { pretty: string; language: "json" | "text"; unwrapped: boolean } {
  if (raw == null) return { pretty: "", language: "text", unwrapped: false };

  const envelope = raw as { result?: unknown; error?: unknown };

  if (envelope?.error != null) {
    return { pretty: JSON.stringify(envelope.error, null, 2), language: "json", unwrapped: true };
  }

  const result = envelope?.result as
    | { structuredContent?: unknown; content?: Array<{ type?: string; text?: string }> }
    | undefined;

  if (result?.structuredContent !== undefined) {
    return { pretty: JSON.stringify(result.structuredContent, null, 2), language: "json", unwrapped: true };
  }

  const textBlocks = result?.content?.filter((c) => c?.type === "text" && typeof c.text === "string") ?? [];
  if (textBlocks.length > 0) {
    const parsedParts = textBlocks.map((block) => {
      const text = block.text ?? "";
      const trimmed = text.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.stringify(JSON.parse(trimmed), null, 2);
        } catch {
          return text;
        }
      }
      return text;
    });

    const combined = parsedParts.join("\n\n");
    const firstTrim = parsedParts[0]?.trim() ?? "";
    const looksJson = firstTrim.startsWith("{") || firstTrim.startsWith("[");
    return { pretty: combined, language: looksJson ? "json" : "text", unwrapped: true };
  }

  return { pretty: JSON.stringify(raw, null, 2), language: "json", unwrapped: false };
}

function ResultPanel({ result }: { result: unknown }) {
  const [view, setView] = useState<"pretty" | "raw">("pretty");
  const unwrapped = unwrapToolResult(result);
  const rawText = JSON.stringify(result, null, 2);
  const showToggle = unwrapped.unwrapped;
  const code = view === "pretty" ? unwrapped.pretty : rawText;
  const isPlainText = view === "pretty" && unwrapped.language === "text";

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider">Result</h3>
        <div className="flex items-center gap-2">
          {showToggle && (
            <div className="flex rounded-md border border-foreground/[0.08] overflow-hidden">
              <button
                onClick={() => setView("pretty")}
                className={`text-[10px] px-2 py-1 transition-colors cursor-pointer ${
                  view === "pretty"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.03]"
                }`}
              >
                Pretty
              </button>
              <button
                onClick={() => setView("raw")}
                className={`text-[10px] px-2 py-1 transition-colors cursor-pointer border-l border-foreground/[0.08] ${
                  view === "raw"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.03]"
                }`}
              >
                Raw
              </button>
            </div>
          )}
          <button
            onClick={handleCopy}
            className="text-[10px] px-2 py-1 rounded border border-foreground/[0.08] text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.03] transition-colors cursor-pointer"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-lg border border-foreground/[0.06] overflow-auto">
        {isPlainText ? (
          <pre className="text-xs bg-black/[0.04] p-3 font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground/70">
            {code}
          </pre>
        ) : (
          <CodeBlock code={code} />
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
  accessToken: string | null;
  user: { sub: string; name?: string; email?: string; picture?: string } | null;
}

const LOGIN_RETURN_PATH = "/playground/live";

export function LiveMCPPlayground({ accessToken, user }: LiveMCPPlaygroundProps) {
  const { state, selectTool, setToolArgs, reset, initSession, callTool } = useLiveMCPState(
    accessToken ?? ""
  );

  const [collapsed, setCollapsed] = useState<Record<ColumnId, boolean>>({
    tools: false,
    center: false,
    log: false,
  });

  const toggleCollapsed = (id: ColumnId) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const maximize = (id: ColumnId) =>
    setCollapsed({
      tools: id !== "tools",
      center: id !== "center",
      log: id !== "log",
    });

  const toolsControls: ColumnControls = {
    collapsed: collapsed.tools,
    onToggle: () => toggleCollapsed("tools"),
    onMaximize: () => maximize("tools"),
  };
  const centerControls: ColumnControls = {
    collapsed: collapsed.center,
    onToggle: () => toggleCollapsed("center"),
    onMaximize: () => maximize("center"),
  };
  const logControls: ColumnControls = {
    collapsed: collapsed.log,
    onToggle: () => toggleCollapsed("log"),
    onMaximize: () => maximize("log"),
  };

  const handleInitSession = () => {
    if (!accessToken) {
      window.location.href = `/oauth/login?returnTo=${encodeURIComponent(LOGIN_RETURN_PATH)}`;
      return;
    }
    initSession();
  };

  const handleReinitialize = () => {
    // /oauth/login always sets prompt=login, so Auth0 forces a fresh login.
    window.location.href = `/oauth/login?returnTo=${encodeURIComponent(LOGIN_RETURN_PATH)}`;
  };

  // Auto-initialize the MCP session once we have an access token. This covers
  // both the post-login redirect ("user just signed in, skip the extra click")
  // and the pre-auth case where they already had a cookie session.
  const autoInitAttempted = useRef(false);
  useEffect(() => {
    if (
      accessToken &&
      !state.sessionId &&
      !state.loading &&
      !state.error &&
      !autoInitAttempted.current
    ) {
      autoInitAttempted.current = true;
      initSession();
    }
  }, [accessToken, state.sessionId, state.loading, state.error, initSession]);

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
    <div className="flex flex-col h-full bg-white">
      {/* Top Header (full width) */}
      <header className="shrink-0 px-6 py-4 border-b border-foreground/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-foreground/80">Live MCP Playground</h1>
              {accessToken && (
                <button
                  onClick={handleReinitialize}
                  className="text-[10px] px-2 py-1 rounded border border-foreground/[0.08] text-foreground/50 hover:text-foreground/80 hover:bg-foreground/[0.03] transition-colors cursor-pointer"
                >
                  Reinitialize Session
                </button>
              )}
            </div>
            <p className="text-[11px] text-foreground/30 mt-0.5">
              Authenticated tool calls with real-time token exchange
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.picture && (
                  <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span className="text-xs text-foreground/40">{user.email || user.sub}</span>
              </>
            ) : (
              <span className="text-xs text-foreground/30">Not signed in</span>
            )}
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

      {/* Columns */}
      <div className="flex-1 flex min-h-0">
        {!state.sessionId ? (
          <>
            {/* Pre-session: CTA takes remaining space, log still collapsible */}
            <div className="flex-1 basis-0 min-w-0 overflow-auto px-6 py-5">
              <div className="max-w-md mx-auto text-center mt-16">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-foreground/70 mb-2">Start a Session</h2>
                <p className="text-sm text-foreground/40 mb-6">
                  {accessToken
                    ? "Initialize an MCP session with your access token. The event stream on the right will show each authentication step in real time."
                    : "Sign in with Auth0 to initialize an MCP session. The event stream on the right will show each authentication step in real time."}
                </p>
                <button
                  onClick={handleInitSession}
                  disabled={state.loading}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {state.loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Initializing...
                    </span>
                  ) : accessToken ? (
                    "Initialize Session"
                  ) : (
                    "Sign in and Initialize"
                  )}
                </button>
                {state.error && (
                  <p className="text-xs text-red-500 mt-3">{state.error}</p>
                )}
              </div>
            </div>

            <LiveEventLog accessToken={accessToken} controls={logControls} />
          </>
        ) : (
          <>
            {/* Tools column */}
            {collapsed.tools ? (
              <CollapsedStrip
                label="Tools"
                onExpand={() => toggleCollapsed("tools")}
                side="right"
              />
            ) : (
              <div className="flex-1 basis-0 min-w-[240px] shrink flex flex-col border-r border-foreground/[0.06]">
                <div className="shrink-0 px-5 py-3 border-b border-foreground/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono shrink-0">
                      session active
                    </span>
                    <span className="text-[10px] text-foreground/25 font-mono truncate">
                      {state.sessionId}
                    </span>
                  </div>
                  <ColumnHeaderControls controls={toolsControls} />
                </div>
                <div className="flex-1 overflow-auto px-5 py-4">
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
              </div>
            )}

            {/* Center column */}
            {collapsed.center ? (
              <CollapsedStrip
                label="Inspector"
                onExpand={() => toggleCollapsed("center")}
                side="right"
              />
            ) : (
              <div className="flex-1 basis-0 min-w-[280px] shrink flex flex-col border-r border-foreground/[0.06]">
                <div className="shrink-0 px-6 py-3 border-b border-foreground/[0.06] flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground/50">
                    {state.selectedTool ? "Tool Inspector" : "Inspector"}
                  </span>
                  <ColumnHeaderControls controls={centerControls} />
                </div>
                <div className="flex-1 min-h-0 flex flex-col px-6 py-5">
                  {state.selectedTool ? (
                    <div className="flex flex-col flex-1 min-h-0 w-full max-w-[640px] mx-auto gap-4">
                      <div className="shrink-0">
                        <ToolInputForm
                          tool={state.selectedTool}
                          args={state.toolArgs}
                          onArgsChange={setToolArgs}
                          onCall={handleCallTool}
                          loading={state.loading}
                        />
                      </div>

                      {state.error && (
                        <p className="shrink-0 text-xs text-red-500">{state.error}</p>
                      )}

                      {state.toolResult != null && <ResultPanel result={state.toolResult} />}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-foreground/20 text-sm">
                      Select a tool to get started
                    </div>
                  )}
                </div>
              </div>
            )}

            <LiveEventLog accessToken={accessToken} controls={logControls} />
          </>
        )}
      </div>
    </div>
  );
}
