"use client";

import React, { useEffect, useRef, useState } from "react";
import { LogEventCard, type McpLogEvent } from "./LogEventCard";
import { serverUrls } from "@/hooks/useServerPort";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function McpLogView() {
  const [events, setEvents] = useState<McpLogEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [filter, setFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setStatus("connecting");
    const historyBuf: McpLogEvent[] = [];

    const es = new EventSource(`${serverUrls().api}/api/events/stream`);
    esRef.current = es;

    es.addEventListener("history", (e) => {
      try {
        const evt: McpLogEvent = JSON.parse(e.data);
        if (!seenRef.current.has(evt.id)) {
          seenRef.current.add(evt.id);
          historyBuf.push(evt);
        }
      } catch { /* skip */ }
    });

    es.addEventListener("history-done", () => {
      if (historyBuf.length > 0) {
        setEvents((prev) => {
          // Merge: keep existing events, add any new from history
          const existing = new Set(prev.map((e) => e.id));
          const newEvents = historyBuf.filter((e) => !existing.has(e.id));
          return newEvents.length > 0 ? [...prev, ...newEvents] : prev;
        });
      }
      setStatus("connected");
    });

    es.addEventListener("event", (e) => {
      try {
        const evt: McpLogEvent = JSON.parse(e.data);
        if (seenRef.current.has(evt.id)) return;
        seenRef.current.add(evt.id);
        setEvents((prev) => [...prev, evt]);
      } catch { /* skip */ }
    });

    es.onerror = () => {
      setStatus("disconnected");
      // EventSource auto-reconnects; status will update on next history-done
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events.length]);

  const handleClear = () => {
    setEvents([]);
    seenRef.current = new Set();
    fetch(`${serverUrls().api}/api/events`, { method: "DELETE" }).catch(() => {});
  };

  const TOOL_TYPES = new Set(["tool-call", "tool-result", "tool-list"]);
  const AUTH_TYPES = new Set(["auth-challenge", "token-issued", "token-verified", "token-rejected", "consent", "mcp-dcr", "ciba", "bounded-authority", "ucp-checkout-state", "ucp-payment-auth"]);
  const DISCOVERY_TYPES = new Set(["metadata-fetch", "mcp-discovery", "ucp-discovery"]);
  const filteredEvents =
    filter === "all"
      ? events
      : filter === "tool-result"
        ? events.filter((e) => TOOL_TYPES.has(e.type))
        : filter === "auth-challenge"
          ? events.filter((e) => AUTH_TYPES.has(e.type))
          : filter === "metadata-fetch"
            ? events.filter((e) => DISCOVERY_TYPES.has(e.type))
            : events.filter((e) => e.type === filter);

  const errorCount = events.filter(
    (e) => e.result === "error" || e.result === "denied"
  ).length;

  const statusColor =
    status === "connected"
      ? "bg-emerald-400"
      : status === "connecting"
        ? "bg-amber-400"
        : "bg-red-400";

  const statusLabel =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting..."
        : "Disconnected";

  const streamDisplay = "/api/events/stream";
  const mcpDisplay = "/mcp";

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "session-init", label: "Sessions" },
    { value: "auth-challenge", label: "Auth" },
    { value: "token-verified", label: "Tokens" },
    { value: "tool-result", label: "Tools" },
    { value: "metadata-fetch", label: "Discovery" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="shrink-0 border-b border-foreground/[0.08] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${statusColor} ${
                  status === "connecting" ? "animate-pulse" : ""
                }`}
              />
              <h1 className="text-base font-semibold text-foreground/80">
                StyleVault Server Logs
              </h1>
            </div>
            <span className="text-xs text-foreground/30 font-mono">
              {streamDisplay}
            </span>
          </div>

          <button
            onClick={handleClear}
            className="text-xs px-3 py-1.5 rounded-md border border-foreground/[0.08] text-foreground/40 hover:text-foreground/60 hover:border-foreground/15 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 mt-3">
          {filterOptions.map((opt) => {
            const count =
              opt.value === "all"
                ? events.length
                : events.filter((e) => {
                    if (opt.value === "tool-result") return TOOL_TYPES.has(e.type);
                    if (opt.value === "auth-challenge") return AUTH_TYPES.has(e.type);
                    if (opt.value === "metadata-fetch") return DISCOVERY_TYPES.has(e.type);
                    if (opt.value === "token-verified") return e.type === "token-verified" || e.type === "token-rejected";
                    return e.type === opt.value;
                  }).length;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filter === opt.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/35 hover:text-foreground/55 hover:bg-foreground/[0.03]"
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span className="ml-1 text-[9px] opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-foreground/25 text-sm">
              {status === "connected"
                ? "Waiting for events..."
                : "Connecting to server..."}
            </p>
            <p className="text-foreground/15 text-xs mt-1">
              Send requests to{" "}
              <span className="font-mono">{mcpDisplay}</span> to
              see events here
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {filteredEvents.map((event, i) => (
              <LogEventCard
                key={event.id}
                event={event}
                isLatest={i === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-foreground/[0.08] px-6 py-3">
        <div className="flex items-center gap-4 text-xs text-foreground/35">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${statusColor}`}
            />
            <span>{statusLabel}</span>
          </div>
          <span className="text-foreground/15">|</span>
          <span>{events.length} events</span>
          <span className="text-foreground/15">|</span>
          <span className={errorCount > 0 ? "text-red-400" : ""}>
            {errorCount} {errorCount === 1 ? "error" : "errors"}
          </span>
        </div>
      </footer>
    </div>
  );
}
