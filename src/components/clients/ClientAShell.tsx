"use client";

import React, { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatSimulator } from "./ChatSimulator";

interface ClientAShellProps {
  messages: ChatMessage[];
  visibleCount: number;
  typing?: boolean;
  inputValue?: string;
}

export function ClientAShell({ messages, visibleCount, typing, inputValue }: ClientAShellProps) {
  const [userTyping, setUserTyping] = useState({ typing: false, text: "", done: false });
  const handleUserTyping = useCallback((state: { typing: boolean; text: string; done: boolean }) => {
    setUserTyping(state);
  }, []);
  const sendFlash = userTyping.done;
  const displayInput = userTyping.typing ? userTyping.text : (inputValue || "");

  return (
    <div className="client-a-light flex h-full rounded-xl overflow-hidden border">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--client-sidebar)] border-r flex flex-col p-3">
        <div className="flex items-center gap-2 px-3 py-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[#4016A0]/10 flex items-center justify-center">
            <span className="text-xs font-bold text-[#4016A0]">S</span>
          </div>
          <span className="text-sm font-medium text-[var(--client-text)]">RetailZero AI</span>
        </div>
        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--client-muted)] hover:bg-black/5 transition-colors cursor-pointer">
          + New chat
        </button>
        <div className="mt-4 space-y-1">
          <div className="px-3 py-2 rounded-lg bg-black/5 text-sm text-[var(--client-text)]">
            Help me find a birthday gift
          </div>
          <div className="px-3 py-2 rounded-lg text-sm text-[var(--client-muted)]">
            Reorder my favorite sneakers
          </div>
          <div className="px-3 py-2 rounded-lg text-sm text-[var(--client-muted)]">
            Track my recent delivery
          </div>
        </div>
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#4016A0]/10 flex items-center justify-center text-xs font-bold text-[#4016A0]">
              AM
            </div>
            <span className="text-sm text-[var(--client-muted)]">Alex Morgan</span>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[var(--client-bg)] min-h-0">
        <div className="flex items-center justify-center py-3 border-b">
          <span className="text-sm font-medium text-[var(--client-text)]">RetailZero AI</span>
          <svg className="ml-1 w-4 h-4 text-[var(--client-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>

        <ChatSimulator
          messages={messages}
          visibleCount={visibleCount}
          theme="dark"
          clientName="RetailZero AI"
          typing={typing}
          onUserTyping={handleUserTyping}
        />

        <div className="p-4">
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--client-input)] px-4 py-3 border">
            <span className={`flex-1 text-sm ${userTyping.typing ? "text-[var(--client-text)]" : "text-[var(--client-muted)]"}`}>
              {displayInput || "Message RetailZero AI..."}
              {userTyping.typing && <span className="animate-pulse">|</span>}
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              sendFlash ? "bg-[var(--client-text)] text-white scale-90" : userTyping.typing ? "bg-[var(--client-text)] text-white" : "bg-black/5 text-[var(--client-muted)]"
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
