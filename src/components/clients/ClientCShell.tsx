"use client";

import React, { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatSimulator } from "./ChatSimulator";

interface ClientCShellProps {
  messages: ChatMessage[];
  visibleCount: number;
  typing?: boolean;
  inputValue?: string;
}

export function ClientCShell({ messages, visibleCount, typing, inputValue }: ClientCShellProps) {
  const [userTyping, setUserTyping] = useState({ typing: false, text: "", done: false });
  const handleUserTyping = useCallback((state: { typing: boolean; text: string; done: boolean }) => {
    setUserTyping(state);
  }, []);
  const sendFlash = userTyping.done;
  const displayInput = userTyping.typing ? userTyping.text : (inputValue || "");
  return (
    <div className="client-c-enterprise flex h-full rounded-xl overflow-hidden border">
      {/* Mock product dashboard background */}
      <div className="flex-1 bg-[var(--client-bg)] relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4016A0]/10 flex items-center justify-center">
              <span className="text-sm font-bold text-[#4016A0]">SV</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--client-text)]">StyleVault Dashboard</h3>
              <p className="text-xs text-[var(--client-muted)]">alex@example.com</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--client-muted)]">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            StyleScout connected
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-black/[0.02] border p-4">
            <p className="text-xs text-[var(--client-muted)] mb-1">Wishlist Items</p>
            <p className="text-2xl font-bold text-[var(--client-text)]">4</p>
          </div>
          <div className="rounded-lg bg-black/[0.02] border p-4">
            <p className="text-xs text-[var(--client-muted)] mb-1">Recent Orders</p>
            <p className="text-2xl font-bold text-[var(--client-text)]">7</p>
          </div>
          <div className="rounded-lg bg-black/[0.02] border p-4">
            <p className="text-xs text-[var(--client-muted)] mb-1">Loyalty Points</p>
            <p className="text-2xl font-bold text-[var(--client-text)]">2,450</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 opacity-40">
          {["Cashmere Scarf", "Silk Blazer", "Canvas Sneakers"].map((item) => (
            <div key={item} className="rounded-lg bg-black/[0.02] border p-3">
              <div className="w-full h-20 rounded bg-black/[0.03] mb-2" />
              <p className="text-xs text-[var(--client-muted)]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating chat widget */}
      <div className="w-[400px] border-l flex flex-col bg-[var(--client-sidebar)] min-h-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-[#4016A0]/5">
          <div className="w-6 h-6 rounded-md bg-[#4016A0]/10 flex items-center justify-center">
            <span className="text-xs font-bold text-[#4016A0]">SS</span>
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-[var(--client-text)]">StyleScout</span>
            <span className="ml-2 text-xs text-[var(--client-muted)]">Search only &middot; 15m session</span>
          </div>
        </div>

        <ChatSimulator
          messages={messages}
          visibleCount={visibleCount}
          theme="enterprise"
          clientName="StyleScout"
          typing={typing}
          onUserTyping={handleUserTyping}
        />

        <div className="p-3 border-t">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--client-input)] px-3 py-2 border">
            <span className={`flex-1 text-sm ${userTyping.typing ? "text-[var(--client-text)]" : "text-[var(--client-muted)]"}`}>
              {displayInput || "Search products..."}
              {userTyping.typing && <span className="animate-pulse">|</span>}
            </span>
            <svg className={`w-4 h-4 transition-all duration-200 ${sendFlash ? "text-[var(--client-text)] scale-90" : "text-[var(--client-muted)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
