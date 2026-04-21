"use client";

import React, { useState } from "react";
import { CodeBlock } from "./SyntaxHighlight";

export interface McpLogEvent {
  id: string;
  timestamp: string;
  type:
    | "session-init"
    | "auth-challenge"
    | "token-verified"
    | "token-rejected"
    | "metadata-fetch"
    | "tool-list"
    | "tool-call"
    | "tool-result"
    | "session-close";
  result: "success" | "denied" | "error" | "info";
  summary: string;
  details: {
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    requestBody?: unknown;
    responseBody?: unknown;
    sessionId?: string;
    tokenClaims?: Record<string, unknown>;
    toolName?: string;
    toolArgs?: unknown;
    toolResult?: unknown;
    scopes?: string[];
    error?: string;
    duration?: number;
  };
}

const EVENT_ICONS: Record<string, string> = {
  "session-init": "\u26A1",
  "auth-challenge": "\uD83D\uDD12",
  "token-verified": "\u2705",
  "token-rejected": "\u274C",
  "metadata-fetch": "\uD83C\uDF10",
  "tool-list": "\uD83D\uDCCB",
  "tool-call": "\u2699\uFE0F",
  "tool-result": "\uD83D\uDCE6",
  "session-close": "\uD83D\uDEAA",
  "consent": "\uD83D\uDD12",
  "ciba": "\uD83D\uDCF1",
  "token-issued": "\uD83D\uDD11",
  "mcp-discovery": "\uD83C\uDF10",
  "mcp-dcr": "\uD83D\uDCDD",
  "ucp-discovery": "\uD83C\uDF10",
  "ucp-checkout-state": "\uD83D\uDED2",
  "ucp-payment-auth": "\uD83D\uDCB3",
  "bounded-authority": "\uD83D\uDEE1\uFE0F",
  "scope-denial": "\u26D4",
};

const EVENT_LABELS: Record<string, string> = {
  "session-init": "Session Init",
  "auth-challenge": "Auth Challenge",
  "token-verified": "Token Verified",
  "token-rejected": "Token Rejected",
  "metadata-fetch": "Metadata Discovery",
  "tool-list": "Tool List",
  "tool-call": "Tool Call",
  "tool-result": "Tool Result",
  "session-close": "Session Close",
  "consent": "Consent",
  "ciba": "Step-Up Auth",
  "token-issued": "Token Issued",
  "mcp-discovery": "MCP Discovery",
  "mcp-dcr": "Client Registration",
  "ucp-discovery": "UCP Discovery",
  "ucp-checkout-state": "Checkout State",
  "ucp-payment-auth": "Payment Auth",
  "bounded-authority": "Bounded Authority",
  "scope-denial": "Scope Denied",
};

const RESULT_COLORS: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  success: {
    bg: "rgba(34, 197, 94, 0.06)",
    border: "rgba(34, 197, 94, 0.25)",
    text: "#22c55e",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  denied: {
    bg: "rgba(239, 68, 68, 0.06)",
    border: "rgba(239, 68, 68, 0.25)",
    text: "#ef4444",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  error: {
    bg: "rgba(239, 68, 68, 0.06)",
    border: "rgba(239, 68, 68, 0.25)",
    text: "#ef4444",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  info: {
    bg: "rgba(59, 130, 246, 0.06)",
    border: "rgba(59, 130, 246, 0.2)",
    text: "#3b82f6",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
};

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

function formatDetail(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

interface Props {
  event: McpLogEvent;
  isLatest?: boolean;
}

export function LogEventCard({ event, isLatest }: Props) {
  const [expanded, setExpanded] = useState(false);
  const colors = RESULT_COLORS[event.result] ?? RESULT_COLORS.info;
  const d = event.details;

  const hasDetails = !!(
    d.headers ||
    d.requestBody ||
    d.responseBody ||
    d.tokenClaims ||
    d.toolArgs ||
    d.toolResult ||
    d.scopes ||
    d.error
  );

  return (
    <div
      className={`rounded-lg border transition-all ${
        isLatest ? "event-card-active" : "opacity-60 hover:opacity-100"
      } ${hasDetails ? "cursor-pointer" : ""}`}
      style={{ borderColor: colors.border, backgroundColor: colors.bg }}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Chevron */}
        {hasDetails ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`mt-0.5 shrink-0 text-foreground/25 transition-transform duration-200 ${
              expanded ? "rotate-90" : ""
            }`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Icon */}
        <span className="text-base mt-0.5 shrink-0">
          {EVENT_ICONS[event.type] ?? "\u2139\uFE0F"}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-foreground/35">
              {formatTime(event.timestamp)}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${colors.badge}`}
            >
              {event.result.toUpperCase()}
            </span>
            <span className="text-[10px] text-foreground/30 font-medium">
              {EVENT_LABELS[event.type] ?? event.type}
            </span>
            {d.duration !== undefined && (
              <span className="text-[10px] text-foreground/25 font-mono ml-auto">
                {d.duration}ms
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/70 leading-snug">
            {event.summary}
          </p>
          {d.sessionId && (
            <p className="text-[10px] text-foreground/25 font-mono mt-0.5 truncate">
              session: {d.sessionId}
            </p>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div
          className="border-t px-3.5 py-3 space-y-3"
          style={{ borderColor: colors.border }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scopes */}
          {d.scopes && d.scopes.length > 0 && (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Scopes
              </p>
              <div className="flex flex-wrap gap-1">
                {d.scopes.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/[0.04] text-foreground/50 border border-foreground/[0.06]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {d.error ? (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Error
              </p>
              <pre className="text-xs bg-red-500/[0.06] border border-red-500/20 rounded p-2.5 font-mono text-red-400 whitespace-pre-wrap break-words">
                {String(d.error)}
              </pre>
            </div>
          ) : null}

          {/* Headers */}
          {d.headers && Object.keys(d.headers).length > 0 && (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Request Headers
              </p>
              <CodeBlock
                code={Object.entries(d.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
              />
            </div>
          )}

          {/* Request body */}
          {d.requestBody ? (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Request Body
              </p>
              <CodeBlock code={formatDetail(d.requestBody)} />
            </div>
          ) : null}

          {/* Tool arguments */}
          {d.toolArgs ? (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Tool Arguments
              </p>
              <CodeBlock code={formatDetail(d.toolArgs)} />
            </div>
          ) : null}

          {/* Token claims */}
          {d.tokenClaims ? (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Token Claims
              </p>
              <CodeBlock code={formatDetail(d.tokenClaims)} />
            </div>
          ) : null}

          {/* Response body */}
          {d.responseBody ? (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Response
              </p>
              <CodeBlock code={formatDetail(d.responseBody)} />
            </div>
          ) : null}

          {/* Tool result */}
          {d.toolResult ? (
            <div>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1">
                Tool Result
              </p>
              <CodeBlock code={formatDetail(d.toolResult)} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
