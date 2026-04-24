"use client";

import React, { useState } from "react";

function decodeJwtParts(token: string): { header: object; payload: object } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { header, payload };
  } catch {
    return null;
  }
}

function SyntaxHighlightedJson({ data }: { data: object }) {
  const json = JSON.stringify(data, null, 2);

  // Tokenize JSON for syntax highlighting
  const highlighted = json.replace(
    /("(?:\\.|[^"\\])*")\s*:/g,
    '<span class="text-[#7c3aed]">$1</span>:'
  ).replace(
    /:\s*("(?:\\.|[^"\\])*")/g,
    ': <span class="text-[#059669]">$1</span>'
  ).replace(
    /:\s*(\d+\.?\d*)/g,
    ': <span class="text-[#d97706]">$1</span>'
  ).replace(
    /:\s*(true|false|null)/g,
    ': <span class="text-[#dc2626]">$1</span>'
  );

  return (
    <pre
      className="text-[13px] leading-relaxed font-mono overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export function TokenViewer({ token, label }: { token: string; label: string }) {
  const [view, setView] = useState<"decoded" | "raw">("decoded");
  const decoded = decodeJwtParts(token);

  return (
    <div className="rounded-xl border border-foreground/[0.08] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/[0.06] bg-foreground/[0.015]">
        <h3 className="text-sm font-semibold text-foreground/80">{label}</h3>
        <div className="flex items-center gap-1 rounded-lg bg-foreground/[0.04] p-0.5">
          <button
            onClick={() => setView("decoded")}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
              view === "decoded"
                ? "bg-white text-primary shadow-sm"
                : "text-foreground/40 hover:text-foreground/60"
            }`}
          >
            Decoded
          </button>
          <button
            onClick={() => setView("raw")}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
              view === "raw"
                ? "bg-white text-primary shadow-sm"
                : "text-foreground/40 hover:text-foreground/60"
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {view === "raw" ? (
          <pre className="text-[12px] leading-relaxed font-mono text-foreground/70 whitespace-pre-wrap break-all bg-foreground/[0.02] rounded-lg p-4 border border-foreground/[0.06]">
            {token}
          </pre>
        ) : decoded ? (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-2">Header</div>
              <div className="bg-foreground/[0.02] rounded-lg p-4 border border-foreground/[0.06]">
                <SyntaxHighlightedJson data={decoded.header} />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-2">Payload</div>
              <div className="bg-foreground/[0.02] rounded-lg p-4 border border-foreground/[0.06]">
                <SyntaxHighlightedJson data={decoded.payload} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-mono font-medium">opaque</span>
              <p className="text-xs text-foreground/40">
                This token has no decodable claims. Authorization is handled via token exchange.
              </p>
            </div>
            <pre className="text-[12px] leading-relaxed font-mono text-foreground/70 whitespace-pre-wrap break-all bg-foreground/[0.02] rounded-lg p-4 border border-foreground/[0.06]">
              {token.slice(0, 12)}{"..."}
              <span className="text-foreground/25">{token.slice(12)}</span>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
