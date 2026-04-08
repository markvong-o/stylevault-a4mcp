"use client";

import React from "react";
import type { SecurityEvent } from "@/lib/types";
import { SecurityEventCard } from "./SecurityEventCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SecurityOverlayProps {
  open: boolean;
  tab: "business" | "technical";
  events: SecurityEvent[];
  onToggle: () => void;
  onSetTab: (tab: "business" | "technical") => void;
}

export function SecurityOverlay({ open, tab, events, onToggle, onSetTab }: SecurityOverlayProps) {
  if (!open) return null;

  return (
    <div className="overlay-panel">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="font-semibold text-foreground">Under the Hood</span>
        </div>
        <button onClick={onToggle} className="text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => onSetTab("business")}
          className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
            tab === "business" ? "text-primary border-b-2 border-primary" : "text-foreground/30 hover:text-foreground/50"
          }`}
        >
          Business View
        </button>
        <button
          onClick={() => onSetTab("technical")}
          className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
            tab === "technical" ? "text-primary border-b-2 border-primary" : "text-foreground/30 hover:text-foreground/50"
          }`}
        >
          Technical View
        </button>
      </div>

      <ScrollArea className="flex-1 px-4 py-4 h-[calc(100vh-120px)]">
        {events.length === 0 ? (
          <div className="text-center text-foreground/30 py-12">
            <p className="text-sm">Security events will appear here as you step through the demo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => (
              <SecurityEventCard key={event.id} event={event} view={tab} isCurrent={i === events.length - 1} />
            ))}
          </div>
        )}
      </ScrollArea>

      {events.length > 0 && (
        <div className="px-4 py-3 border-t">
          <div className="flex justify-between text-xs text-foreground/40">
            <span>{events.filter(e => e.result === "granted" || e.result === "approved").length} allowed</span>
            <span>{events.filter(e => e.result === "denied").length} denied</span>
            <span>{events.length} total events</span>
          </div>
        </div>
      )}
    </div>
  );
}
