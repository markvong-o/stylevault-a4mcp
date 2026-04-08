"use client";

import React, { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatSimulator } from "./ChatSimulator";
import { CHATGPT_CONVERSATIONS } from "@/lib/scenario";

interface ClientBShellProps {
  messages: ChatMessage[];
  visibleCount: number;
  typing?: boolean;
  inputValue?: string;
  activeConversation?: string;
  onConversationClick?: (id: string) => void;
}

export function ClientBShell({ messages, visibleCount, typing, inputValue, activeConversation, onConversationClick }: ClientBShellProps) {
  const [userTyping, setUserTyping] = useState({ typing: false, text: "", done: false });
  const handleUserTyping = useCallback((state: { typing: boolean; text: string; done: boolean }) => {
    setUserTyping(state);
  }, []);
  const sendFlash = userTyping.done;
  const displayInput = userTyping.typing ? userTyping.text : (inputValue || "");

  return (
    <div className="client-b-chatgpt flex h-full rounded-xl overflow-hidden border relative">
      {/* Sidebar */}
      <div className="w-[260px] bg-[var(--client-sidebar)] flex flex-col border-r">
        {/* Sidebar header */}
        <div className="p-3">
          <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[var(--client-text)] hover:bg-black/5 transition-colors cursor-pointer border">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--client-muted)]"><path d="M12 5v14M5 12h14"/></svg>
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/[0.03] text-xs text-[var(--client-muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search chats
          </div>
        </div>

        {/* Conversation list -dynamic from scenario data */}
        <div className="flex-1 overflow-y-auto px-2">
          {/* StyleVault chats */}
          <div className="px-2 py-1.5 text-xs font-medium text-[var(--client-muted)] uppercase tracking-wider">Today</div>
          <div className="space-y-0.5">
            {CHATGPT_CONVERSATIONS.map((conv) => {
              const isActive = activeConversation === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onConversationClick?.(conv.id)}
                  className={`px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-black/[0.05] text-[var(--client-text)] font-medium"
                      : "text-[var(--client-muted)] hover:bg-black/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4016A0] shrink-0" />
                    )}
                    <span className="truncate">{conv.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Other non-StyleVault chats */}
          <div className="px-2 py-1.5 mt-4 text-xs font-medium text-[var(--client-muted)] uppercase tracking-wider">Yesterday</div>
          <div className="space-y-0.5">
            <div className="px-3 py-2.5 rounded-lg text-sm text-[var(--client-muted)] hover:bg-black/[0.03] transition-colors cursor-pointer">
              Plan a weekend trip to Napa
            </div>
            <div className="px-3 py-2.5 rounded-lg text-sm text-[var(--client-muted)] hover:bg-black/[0.03] transition-colors cursor-pointer">
              Debug my Python script
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/[0.03] transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-xs font-bold text-white">
              AM
            </div>
            <span className="text-sm text-[var(--client-text)]">Alex Morgan</span>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[var(--client-bg)] min-h-0">
        {/* Top bar -model selector + connected apps */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <div className="flex items-center gap-3">
            {/* Model selector */}
            <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
              <span className="text-base font-semibold text-[var(--client-text)]">ChatGPT</span>
              <span className="text-xs text-[var(--client-muted)] bg-black/[0.04] px-1.5 py-0.5 rounded">4o</span>
              <svg className="w-4 h-4 text-[var(--client-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-black/10" />

            {/* Connected MCP server dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#4016A0]/[0.06] border border-[#4016A0]/15 cursor-pointer hover:bg-[#4016A0]/10 transition-colors">
              <div className="w-4 h-4 rounded bg-[#4016A0]/15 flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#4016A0]">SV</span>
              </div>
              <span className="text-xs font-medium text-[#4016A0]">StyleVault</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <svg className="w-3 h-3 text-[#4016A0]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-black/5 text-[var(--client-muted)] cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <ChatSimulator
          messages={messages}
          visibleCount={visibleCount}
          theme="dark"
          clientName="ChatGPT"
          typing={typing}
          onUserTyping={handleUserTyping}
        />

        {/* Input area */}
        <div className="px-4 pb-4 pt-2">
          <div className="rounded-2xl bg-[var(--client-input)] border px-4 py-3">
            <div className="flex items-center gap-3">
              <button className="text-[var(--client-muted)] hover:text-[var(--client-text)] transition-colors cursor-pointer shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <span className={`flex-1 text-sm ${userTyping.typing ? "text-[var(--client-text)]" : "text-[var(--client-muted)]"}`}>
                {displayInput || "Message ChatGPT"}
                {userTyping.typing && <span className="animate-pulse">|</span>}
              </span>
              <button className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
                sendFlash ? "bg-[var(--client-text)] text-white scale-90" : userTyping.typing ? "bg-[var(--client-text)] text-white" : "bg-black/5 text-[var(--client-muted)]"
              }`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--client-muted)] text-center mt-2">ChatGPT can make mistakes. Check important info.</p>
        </div>
      </div>

      {/* Mock disclaimer badge */}
      <div className="absolute top-2.5 right-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-600">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          SIMULATED UI / NOT ACTUAL CHATGPT
        </div>
      </div>
    </div>
  );
}
