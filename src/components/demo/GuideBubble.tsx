"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { SecurityEvent } from "@/lib/types";
import { SECURITY_EVENT_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

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

const RESULT_BADGES: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  granted: { label: "GRANTED", variant: "success" },
  approved: { label: "APPROVED", variant: "warning" },
  denied: { label: "DENIED", variant: "error" },
  pending: { label: "PENDING", variant: "default" },
};

interface GuideBubbleProps {
  event: SecurityEvent;
  isLatest?: boolean;
}

export function GuideBubble({ event, isLatest }: GuideBubbleProps) {
  const colors = SECURITY_EVENT_COLORS[event.result] ?? SECURITY_EVENT_COLORS.pending;
  const [expanded, setExpanded] = useState(false);
  const hasMore = event.businessDescription !== event.shortDescription;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: isLatest ? 1 : 0.35, x: 0 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative pl-6"
    >
      {/* Timeline node */}
      <div
        className="absolute left-0 top-3 w-[10px] h-[10px] rounded-full border-2"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.bg,
          boxShadow: isLatest ? `0 0 8px ${colors.border}` : "none",
        }}
      />

      <div
        className="rounded-lg px-3 py-2 border text-xs"
        style={{
          borderColor: isLatest ? colors.border : "rgba(0,0,0,0.06)",
          backgroundColor: isLatest ? colors.bg : "rgba(0,0,0,0.01)",
        }}
      >
        <div className="flex items-start gap-2">
          <span className="text-sm shrink-0">
            {EVENT_ICONS[event.type] ?? "\u2139\uFE0F"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant={RESULT_BADGES[event.result]?.variant ?? "default"}>
                {RESULT_BADGES[event.result]?.label ?? "INFO"}
              </Badge>
              <span className="text-[9px] text-foreground/25">{event.timestamp}</span>
            </div>
            <p className="text-sm text-foreground/60 leading-snug">
              {expanded ? event.businessDescription : event.shortDescription}
            </p>
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 flex items-center gap-1 text-primary/60 hover:text-primary transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>{expanded ? "Less" : "More"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
