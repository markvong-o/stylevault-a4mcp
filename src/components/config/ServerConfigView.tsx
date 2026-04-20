"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wrench,
  Shield,
  Users,
  ShieldAlert,
  Server,
  ChevronRight,
} from "lucide-react";
import { CodeBlock } from "@/components/logs/SyntaxHighlight";
import { useServerPort, serverUrls } from "@/hooks/useServerPort";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScopeInfo {
  name: string;
  description: string;
}

interface ToolInfo {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiredScope?: string;
}

interface ToolGroup {
  id: string;
  label: string;
  subtitle: string;
  endpoint: string;
  transport: string;
  accentColor: string;
  tools: ToolInfo[];
}

interface ServerConfig {
  server: { name: string; version: string; protocolVersion: string };
  auth: { domain: string; audience: string; scopes: ScopeInfo[] };
  toolGroups: ToolGroup[];
  sessions: { active: number; ids: string[] };
  boundedAuthority: {
    maxAgentPurchase: number;
    currency: string;
    description: string;
  };
}

type FetchStatus = "loading" | "connected" | "error";

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-white">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-foreground/[0.05]">
        <Icon size={16} className="text-foreground/35" strokeWidth={1.8} />
        <h3 className="text-[13px] font-semibold text-foreground/65">
          {title}
        </h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool row                                                           */
/* ------------------------------------------------------------------ */

function ToolRow({ tool, accentColor }: { tool: ToolInfo; accentColor: string }) {
  const [open, setOpen] = useState(false);
  const hasSchema = Object.keys(tool.inputSchema).length > 0;

  return (
    <div className="border border-foreground/[0.05] rounded-lg">
      <button
        onClick={() => hasSchema && setOpen(!open)}
        className={`w-full text-left flex items-start gap-3 px-4 py-3 ${hasSchema ? "cursor-pointer hover:bg-foreground/[0.01]" : ""} transition-colors`}
      >
        {hasSchema ? (
          <ChevronRight
            size={14}
            className={`mt-0.5 shrink-0 text-foreground/25 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground/75">
              {tool.title}
            </span>
            <code
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: `${accentColor}08`,
                borderColor: `${accentColor}20`,
                color: `${accentColor}cc`,
              }}
            >
              {tool.name}
            </code>
            {tool.requiredScope && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/[0.08] text-primary/70 border border-primary/[0.12]">
                {tool.requiredScope}
              </span>
            )}
          </div>
          <p className="text-[12px] text-foreground/40 leading-relaxed">
            {tool.description}
          </p>
        </div>
      </button>

      {open && hasSchema && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-1.5 ml-[26px]">
            Input Schema
          </p>
          <div className="ml-[26px]">
            <CodeBlock code={JSON.stringify(tool.inputSchema, null, 2)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabbed tool groups                                                 */
/* ------------------------------------------------------------------ */

function TabbedToolGroups({ groups }: { groups: ToolGroup[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const active = groups[activeTab];

  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-white">
      {/* Tab bar */}
      <div className="flex items-center border-b border-foreground/[0.05]">
        {groups.map((group, i) => {
          const selected = i === activeTab;
          return (
            <button
              key={group.id}
              onClick={() => setActiveTab(i)}
              className={`relative flex items-center gap-2 px-5 py-3 text-[12px] font-medium transition-colors cursor-pointer ${
                selected
                  ? "text-foreground/75"
                  : "text-foreground/35 hover:text-foreground/55 hover:bg-foreground/[0.02]"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: group.accentColor, opacity: selected ? 1 : 0.4 }}
              />
              {group.label}
              <span className={`text-[10px] ${selected ? "text-foreground/40" : "text-foreground/25"}`}>
                {group.tools.length}
              </span>
              {selected && (
                <span
                  className="absolute bottom-0 left-5 right-5 h-[2px] rounded-full"
                  style={{ backgroundColor: group.accentColor }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab meta */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-foreground/[0.04] bg-foreground/[0.01]">
        <p className="text-[11px] text-foreground/40">
          {active.subtitle}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-foreground/30">
          <code
            className="font-mono px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: `${active.accentColor}08`,
              borderColor: `${active.accentColor}18`,
              color: `${active.accentColor}bb`,
            }}
          >
            {active.endpoint}
          </code>
          <span>{active.transport}</span>
        </div>
      </div>

      {/* Tool list */}
      <div className="px-5 py-4 space-y-2">
        {active.tools.map((tool) => (
          <ToolRow key={tool.name} tool={tool} accentColor={active.accentColor} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

export function ServerConfigView() {
  const port = useServerPort();
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [sessionCount, setSessionCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch config from server once port is discovered
  useEffect(() => {
    if (!port) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(serverUrls(port!).config);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ServerConfig = await res.json();
        if (!cancelled) {
          setConfig(data);
          setSessionCount(data.sessions.active);
          setStatus("connected");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [port]);

  // WebSocket for live session count
  const connectWs = useCallback(() => {
    if (!port) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(serverUrls(port).ws);

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        // Track session-init and session-close events
        if (data.type === "event") {
          const evt = data.event;
          if (evt.type === "session-init") {
            setSessionCount((c) => c + 1);
          } else if (evt.type === "session-close") {
            setSessionCount((c) => Math.max(0, c - 1));
          }
        }
      } catch {
        // skip
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectRef.current = setTimeout(connectWs, 3000);
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [port]);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // Loading / error states
  if (status === "loading") {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-sm text-foreground/30 animate-pulse">
          Connecting to server...
        </p>
      </div>
    );
  }

  if (status === "error" || !config) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">
          Could not reach server (tried ports 3001-3010)
        </p>
        <button
          onClick={() => {
            setStatus("loading");
            window.location.reload();
          }}
          className="text-xs text-foreground/40 underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { server, auth, toolGroups, boundedAuthority } = config;
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-foreground/[0.06] px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] text-foreground/35 hover:text-foreground/55 transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground/80">
                Server Configuration
              </h1>
              <p className="text-xs text-foreground/35 mt-0.5">
                {server.name} v{server.version} &middot; Protocol{" "}
                {server.protocolVersion} &middot; {totalTools} tools across {toolGroups.length} protocols
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-foreground/40">Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Server info */}
          <Section icon={Server} title="Server Info">
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Name", server.name],
                ["Version", server.version],
                ["Protocol", server.protocolVersion],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-mono text-foreground/65">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* Registered Tools (tabbed) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Wrench size={16} className="text-foreground/35" strokeWidth={1.8} />
              <h3 className="text-[13px] font-semibold text-foreground/65">
                Registered Tools ({totalTools})
              </h3>
            </div>
            <TabbedToolGroups groups={toolGroups} />
          </div>

          {/* Auth & Scopes */}
          <Section icon={Shield} title="Authentication & Scopes">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-0.5">
                    Auth0 Domain
                  </p>
                  <p className="text-sm font-mono text-foreground/60">
                    {auth.domain}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-0.5">
                    Audience
                  </p>
                  <p className="text-sm font-mono text-foreground/60">
                    {auth.audience}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-2">
                  Supported Scopes
                </p>
                <div className="space-y-1.5">
                  {auth.scopes.map((scope) => (
                    <div
                      key={scope.name}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/[0.06] text-primary/65 border border-primary/[0.1] shrink-0 min-w-[160px]">
                        {scope.name}
                      </code>
                      <span className="text-[12px] text-foreground/40">
                        {scope.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Active Sessions */}
          <Section icon={Users} title="Active Sessions">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
                <span className="text-xl font-semibold text-foreground/65 font-mono">
                  {sessionCount}
                </span>
              </div>
              <div>
                <p className="text-sm text-foreground/55">
                  {sessionCount === 0
                    ? "No active MCP sessions"
                    : sessionCount === 1
                      ? "1 active MCP session"
                      : `${sessionCount} active MCP sessions`}
                </p>
                <p className="text-[11px] text-foreground/30">
                  Updates in real-time via WebSocket
                </p>
              </div>
            </div>
          </Section>

          {/* Bounded Authority */}
          <Section icon={ShieldAlert} title="Bounded Authority">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 px-4 rounded-lg bg-amber-500/[0.06] border border-amber-500/[0.15]">
                  <span className="text-lg font-semibold text-amber-600 font-mono">
                    ${boundedAuthority.maxAgentPurchase}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-foreground/55">
                    Maximum agent transaction limit
                  </p>
                  <p className="text-[11px] text-foreground/30">
                    Per-transaction cap in {boundedAuthority.currency}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-foreground/40 leading-relaxed">
                {boundedAuthority.description}
              </p>
            </div>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-foreground/[0.06] px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4 text-xs text-foreground/30">
          <span>API: {port ? serverUrls(port).config : "discovering..."}</span>
          <span className="text-foreground/15">|</span>
          <span>WebSocket: {port ? serverUrls(port).ws : "discovering..."}</span>
        </div>
      </footer>
    </div>
  );
}
