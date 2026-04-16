"use client";

import React, { useState } from "react";
import type { SecurityEvent } from "@/lib/types";
import { SECURITY_EVENT_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface SecurityEventCardProps {
  event: SecurityEvent;
  view: "business" | "technical";
  isCurrent?: boolean;
}

const EVENT_ICONS: Record<string, string> = {
  consent: "\uD83D\uDD10",
  ciba: "\uD83D\uDD14",
  "scope-denial": "\uD83D\uDEAB",
  "bounded-authority": "\u26A0\uFE0F",
  "token-issued": "\uD83C\uDFAB",
  "fga-check": "\uD83D\uDD0D",
  "tool-call": "\u2699\uFE0F",
  "ucp-discovery": "\uD83C\uDF10",
  "ucp-checkout-state": "\uD83D\uDED2",
  "ucp-payment-auth": "\uD83D\uDCB3",
  "mcp-discovery": "\uD83D\uDD0E",
  "mcp-dcr": "\uD83D\uDCDD",
};

// Lightweight syntax highlighter for HTTP + JSON snippets
function SyntaxHighlight({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && "\n"}
          <HighlightLine line={line} />
        </React.Fragment>
      ))}
    </>
  );
}

function HighlightLine({ line }: { line: string }) {
  // HTTP method + path (request line)
  const httpReq = line.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)\s*(HTTP\/[\d.]+)?$/);
  if (httpReq) {
    return (
      <>
        <span className="text-amber-500 font-semibold">{httpReq[1]}</span>
        {" "}
        <span className="text-sky-400">{httpReq[2]}</span>
        {httpReq[3] && <span className="text-foreground/30"> {httpReq[3]}</span>}
      </>
    );
  }

  // HTTP status line
  const httpStatus = line.match(/^(HTTP\/[\d.]+)\s+(\d{3})\s+(.*)$/);
  if (httpStatus) {
    const code = parseInt(httpStatus[2]);
    const statusColor = code < 300 ? "text-emerald-500" : code < 400 ? "text-amber-500" : "text-red-400";
    return (
      <>
        <span className="text-foreground/30">{httpStatus[1]}</span>
        {" "}
        <span className={`font-semibold ${statusColor}`}>{httpStatus[2]} {httpStatus[3]}</span>
      </>
    );
  }

  // HTTP header (Key: Value)
  const header = line.match(/^([A-Za-z][\w-]*):(.*)$/);
  if (header && !line.trim().startsWith("{") && !line.trim().startsWith("\"")) {
    return (
      <>
        <span className="text-purple-400">{header[1]}</span>
        <span className="text-foreground/30">:</span>
        <span className="text-foreground/50">{header[2]}</span>
      </>
    );
  }

  // URL-encoded form params (key=value&key=value)
  if (line.match(/^&?[\w.:%-]+=/) && !line.trim().startsWith("{")) {
    return <>{highlightParams(line)}</>;
  }

  // JSON-ish lines
  if (line.match(/^\s*[{}\[\]]/) || line.match(/^\s*"[\w_]+"\s*:/)) {
    return <>{highlightJson(line)}</>;
  }

  // Comment lines
  if (line.match(/^\s*\/\//)) {
    return <span className="text-foreground/25 italic">{line}</span>;
  }

  return <>{line}</>;
}

function highlightParams(line: string): React.ReactNode {
  // Split on & and highlight key=value pairs
  const parts = line.split(/(&)/);
  return parts.map((part, i) => {
    if (part === "&") return <span key={i} className="text-foreground/30">&amp;</span>;
    const eq = part.indexOf("=");
    if (eq === -1) return <span key={i}>{part}</span>;
    const key = part.slice(0, eq);
    const val = part.slice(eq + 1);
    return (
      <React.Fragment key={i}>
        <span className="text-purple-400">{key}</span>
        <span className="text-foreground/30">=</span>
        <span className="text-sky-400">{val}</span>
      </React.Fragment>
    );
  });
}

function highlightJson(line: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Whitespace / braces / brackets / commas
    const structural = remaining.match(/^([\s{}\[\],]+)/);
    if (structural) {
      nodes.push(<span key={key++} className="text-foreground/30">{structural[1]}</span>);
      remaining = remaining.slice(structural[1].length);
      continue;
    }

    // JSON key "key":
    const jsonKey = remaining.match(/^("[\w_\-. ]+")(\s*:\s*)/);
    if (jsonKey) {
      nodes.push(<span key={key++} className="text-purple-400">{jsonKey[1]}</span>);
      nodes.push(<span key={key++} className="text-foreground/30">{jsonKey[2]}</span>);
      remaining = remaining.slice(jsonKey[0].length);
      continue;
    }

    // String value "..."
    const str = remaining.match(/^("(?:[^"\\]|\\.)*")/);
    if (str) {
      nodes.push(<span key={key++} className="text-emerald-400">{str[1]}</span>);
      remaining = remaining.slice(str[1].length);
      continue;
    }

    // Number
    const num = remaining.match(/^(-?\d+\.?\d*)/);
    if (num) {
      nodes.push(<span key={key++} className="text-amber-400">{num[1]}</span>);
      remaining = remaining.slice(num[1].length);
      continue;
    }

    // Boolean / null
    const bool = remaining.match(/^(true|false|null)/);
    if (bool) {
      nodes.push(<span key={key++} className="text-amber-400 font-semibold">{bool[1]}</span>);
      remaining = remaining.slice(bool[1].length);
      continue;
    }

    // Ellipsis or anything else
    const other = remaining.match(/^(\S+)/);
    if (other) {
      nodes.push(<span key={key++} className="text-foreground/40">{other[1]}</span>);
      remaining = remaining.slice(other[1].length);
      continue;
    }

    // Fallback: single char
    nodes.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{nodes}</>;
}

const RESULT_BADGES: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  granted: { label: "GRANTED", variant: "success" },
  approved: { label: "APPROVED", variant: "warning" },
  denied: { label: "DENIED", variant: "error" },
  pending: { label: "PENDING", variant: "default" },
};

interface CarouselPage {
  label: string;
  content: React.ReactNode;
}

function MiniCarousel({ pages }: { pages: CarouselPage[] }) {
  const [current, setCurrent] = useState(0);
  if (pages.length === 0) return null;

  const page = pages[current];

  return (
    <div className="mt-2">
      {/* Nav bar */}
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={() => setCurrent(i => Math.max(0, i - 1))}
          disabled={current === 0}
          className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-foreground/60 disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                i === current
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-foreground/30 hover:text-foreground/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrent(i => Math.min(pages.length - 1, i + 1))}
          disabled={current === pages.length - 1}
          className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-foreground/60 disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <span className="text-[9px] text-foreground/25 ml-auto">{current + 1}/{pages.length}</span>
      </div>

      {/* Page content */}
      <div className="min-h-[60px]">
        {page.content}
      </div>
    </div>
  );
}

const preClass = "text-xs bg-black/[0.04] rounded p-2 font-mono whitespace-pre-wrap break-words mt-1";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className={preClass}><SyntaxHighlight code={code} /></pre>
  );
}

function RequestResponseToggle({ request, response }: { request: string; response: string }) {
  const [tab, setTab] = useState<"request" | "response">("request");
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-0.5 mb-1">
        <button
          onClick={() => setTab("request")}
          className={`text-[9px] px-2 py-0.5 rounded transition-all cursor-pointer ${
            tab === "request" ? "bg-foreground/10 text-foreground/70 font-medium" : "text-foreground/30 hover:text-foreground/50"
          }`}
        >
          Request
        </button>
        <button
          onClick={() => setTab("response")}
          className={`text-[9px] px-2 py-0.5 rounded transition-all cursor-pointer ${
            tab === "response" ? "bg-foreground/10 text-foreground/70 font-medium" : "text-foreground/30 hover:text-foreground/50"
          }`}
        >
          Response
        </button>
      </div>
      <CodeBlock code={tab === "request" ? request : response} />
    </div>
  );
}

function ToolCallTechnicalView({ event }: { event: SecurityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const td = event.technicalDetail;

  const pages: CarouselPage[] = [];

  const isUcp = event.type === "ucp-payment-auth" || td.protocol?.includes("UCP");
  pages.push({
    label: isUcp ? "UCP" : "MCP",
    content: (
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-primary">1</span>
        </div>
        <div>
          <span className="text-xs font-medium text-foreground/60">{isUcp ? "UCP Agent initiates commerce action" : "MCP Server receives tool call"}</span>
          <p className="text-xs text-foreground/40 mt-0.5">
            {isUcp ? "Gemini invokes " : "Client invokes "}<span className="font-mono text-foreground/60">{td.toolName}</span>{isUcp ? " via Universal Commerce Protocol" : " on StyleVault MCP server"}
          </p>
        </div>
      </div>
    ),
  });

  if (td.tokenExchange) {
    pages.push({
      label: "Token Exchange",
      content: (
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-primary">2</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-foreground/60">Auth0 Custom Token Exchange</span>
            <RequestResponseToggle request={td.tokenExchange.request} response={td.tokenExchange.response} />
          </div>
        </div>
      ),
    });
  }

  if (td.downstreamApi) {
    const stepNum = td.tokenExchange ? 3 : 2;
    pages.push({
      label: "API",
      content: (
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-primary">{stepNum}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-foreground/60">StyleVault API (with exchanged token)</span>
            <RequestResponseToggle request={td.downstreamApi.request} response={td.downstreamApi.response} />
          </div>
        </div>
      ),
    });
  }

  if (td.tokenClaims) {
    pages.push({
      label: td.idTokenClaims ? "Access Token" : "Claims",
      content: (
        <div>
          <span className="text-xs text-foreground/40">{td.idTokenClaims ? "Access Token Claims:" : "Token Claims:"}</span>
          <CodeBlock code={JSON.stringify(td.tokenClaims, null, 2)} />
        </div>
      ),
    });
  }

  if (td.idTokenClaims) {
    pages.push({
      label: "ID Token",
      content: (
        <div>
          <span className="text-xs text-foreground/40">ID Token Claims:</span>
          <CodeBlock code={JSON.stringify(td.idTokenClaims, null, 2)} />
        </div>
      ),
    });
  }

  return (
    <div>
      <p className="text-xs text-foreground/50 mb-1 font-mono">{td.toolName}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary hover:underline cursor-pointer"
      >
        {expanded ? "Hide flow" : "Show flow"}
      </button>
      {expanded && <MiniCarousel pages={pages} />}
    </div>
  );
}

function DefaultTechnicalView({ event }: { event: SecurityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const td = event.technicalDetail;

  const pages: CarouselPage[] = [];

  if (td.request && td.response) {
    pages.push({
      label: "Request / Response",
      content: <RequestResponseToggle request={td.request} response={td.response} />,
    });
  } else if (td.request) {
    pages.push({
      label: "Request",
      content: <CodeBlock code={td.request} />,
    });
  } else if (td.response) {
    pages.push({
      label: "Response",
      content: <CodeBlock code={td.response} />,
    });
  }

  if (td.tokenClaims) {
    pages.push({
      label: td.idTokenClaims ? "Access Token" : "Claims",
      content: (
        <div>
          <span className="text-xs text-foreground/40">{td.idTokenClaims ? "Access Token Claims:" : "Token Claims:"}</span>
          <CodeBlock code={JSON.stringify(td.tokenClaims, null, 2)} />
        </div>
      ),
    });
  }

  if (td.idTokenClaims) {
    pages.push({
      label: "ID Token",
      content: (
        <div>
          <span className="text-xs text-foreground/40">ID Token Claims:</span>
          <CodeBlock code={JSON.stringify(td.idTokenClaims, null, 2)} />
        </div>
      ),
    });
  }

  if (td.fgaTuple) {
    pages.push({
      label: "FGA",
      content: (
        <div className="text-xs">
          <span className="text-foreground/40">FGA Check: </span>
          <span className="text-foreground/60 font-mono">
            {td.fgaTuple.user} → {td.fgaTuple.relation} → {td.fgaTuple.object}
            {" = "}{td.fgaTuple.allowed ? "allowed" : "denied"}
          </span>
        </div>
      ),
    });
  }

  // If only one page, render directly without carousel
  if (pages.length <= 1) {
    return (
      <div>
        <p className="text-xs text-foreground/50 mb-1">{td.protocol}</p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline cursor-pointer"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
        {expanded && <div className="mt-2">{pages[0]?.content}</div>}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-foreground/50 mb-1">{td.protocol}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary hover:underline cursor-pointer"
      >
        {expanded ? "Hide details" : "Show details"}
      </button>
      {expanded && <MiniCarousel pages={pages} />}
    </div>
  );
}

export function SecurityEventCard({ event, view, isCurrent }: SecurityEventCardProps) {
  const colors = SECURITY_EVENT_COLORS[event.result] ?? SECURITY_EVENT_COLORS.pending;
  const badge = RESULT_BADGES[event.result] ?? RESULT_BADGES.pending;

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        isCurrent ? "event-card-active" : "opacity-50 hover:opacity-100"
      }`}
      style={{ borderColor: colors.border, backgroundColor: colors.bg }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{EVENT_ICONS[event.type] ?? "\u2139\uFE0F"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-foreground/40">{event.timestamp}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>

          {view === "business" ? (
            <p className="text-sm text-foreground/80">{event.businessDescription}</p>
          ) : event.type === "tool-call" || event.type === "ucp-payment-auth" ? (
            <ToolCallTechnicalView event={event} />
          ) : (
            <DefaultTechnicalView event={event} />
          )}
        </div>
      </div>
    </div>
  );
}
