"use client";

import React from "react";
import { CodeBlock } from "@/components/logs/SyntaxHighlight";
import type { RequestRecord } from "@/hooks/usePlaygroundState";

interface Props {
  label: string;
  request: RequestRecord | undefined;
  loading?: boolean;
}

export function RequestResponsePanel({ label, request, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-foreground/[0.06] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-foreground/[0.05] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</span>
        </div>
        <div className="px-4 py-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="ml-2 text-xs text-foreground/30">Sending request...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="rounded-xl border border-foreground/[0.06] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-foreground/[0.05]">
          <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</span>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-foreground/20">Execute the action to see the request and response here.</p>
        </div>
      </div>
    );
  }

  const statusColor = request.status
    ? request.status < 300 ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      : request.status < 400 ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
      : "text-red-600 bg-red-500/10 border-red-500/20"
    : "";

  // Build request display string
  const reqLines: string[] = [];
  const urlObj = (() => { try { return new URL(request.url); } catch { return null; } })();
  const path = urlObj ? `${urlObj.pathname}${urlObj.search}` : request.url;
  reqLines.push(`${request.method} ${path} HTTP/1.1`);
  if (urlObj) reqLines.push(`Host: ${urlObj.host}`);
  if (request.headers) {
    for (const [k, v] of Object.entries(request.headers)) {
      reqLines.push(`${k}: ${v}`);
    }
  }
  if (request.body) {
    reqLines.push("");
    reqLines.push(request.body);
  }

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-foreground/[0.05] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          {request.status && (
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${statusColor}`}>
              {request.status}
            </span>
          )}
          {request.latencyMs != null && (
            <span className="text-[10px] font-mono text-foreground/30">
              {request.latencyMs}ms
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-foreground/[0.04]">
        {/* Request */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1.5 font-semibold">Request</p>
          <CodeBlock code={reqLines.join("\n")} />
        </div>

        {/* Response */}
        {request.response && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1.5 font-semibold">Response</p>
            <div className="max-h-[400px] overflow-y-auto">
              <CodeBlock code={request.response} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
