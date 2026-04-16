"use client";

import React, { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatSimulator } from "./ChatSimulator";
import { GEMINI_CONVERSATIONS } from "@/lib/scenario";

interface ClientGeminiShellProps {
  messages: ChatMessage[];
  visibleCount: number;
  typing?: boolean;
  inputValue?: string;
  activeConversation?: string;
  onConversationClick?: (id: string) => void;
}

export function ClientGeminiShell({ messages, visibleCount, typing, inputValue, activeConversation, onConversationClick }: ClientGeminiShellProps) {
  const [userTyping, setUserTyping] = useState({ typing: false, text: "", done: false });
  const handleUserTyping = useCallback((state: { typing: boolean; text: string; done: boolean }) => {
    setUserTyping(state);
  }, []);
  const sendFlash = userTyping.done;
  const displayInput = userTyping.typing ? userTyping.text : (inputValue || "");

  return (
    <div className="client-gemini flex h-full rounded-xl overflow-hidden border relative">
      {/* Sidebar - Gemini Material Design style */}
      <div className="w-[280px] bg-[var(--client-sidebar)] flex flex-col border-r">
        {/* Sidebar header with FAB-style button */}
        <div className="p-4 flex items-center justify-between">
          <button className="w-12 h-12 rounded-full bg-[#4285f4] text-white flex items-center justify-center hover:bg-[#3367d6] transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <div className="flex-1" />
        </div>

        {/* Search */}
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#4285f4]/[0.08] text-xs text-[var(--client-muted)] hover:bg-[#4285f4]/[0.12] transition-colors cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="px-3 py-2 text-xs font-medium text-[var(--client-muted)] uppercase tracking-wider">Today</div>
          <div className="space-y-1.5">
            {GEMINI_CONVERSATIONS.map((conv) => {
              const isActive = activeConversation === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onConversationClick?.(conv.id)}
                  className={`px-4 py-2.5 rounded-full text-sm cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "bg-[#4285f4]/[0.12] text-[var(--client-text)] font-medium"
                      : "text-[var(--client-muted)] hover:bg-[#4285f4]/[0.06]"
                  }`}
                >
                  <span className="truncate">{conv.label}</span>
                </div>
              );
            })}
          </div>

          {/* Filler chats */}
          <div className="px-3 py-2 mt-5 text-xs font-medium text-[var(--client-muted)] uppercase tracking-wider">Yesterday</div>
          <div className="space-y-1.5">
            <div className="px-4 py-2.5 rounded-full text-sm text-[var(--client-muted)] hover:bg-[#4285f4]/[0.06] transition-colors cursor-pointer">
              Compare flight prices to Tokyo
            </div>
            <div className="px-4 py-2.5 rounded-full text-sm text-[var(--client-muted)] hover:bg-[#4285f4]/[0.06] transition-colors cursor-pointer">
              Summarize research paper
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-[#4285f4]/[0.06] transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#4285f4] flex items-center justify-center text-xs font-bold text-white shrink-0">
              AM
            </div>
            <span className="text-sm text-[var(--client-text)]">Alex Morgan</span>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[var(--client-bg)] min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            {/* Model selector with Gemini sparkle icon */}
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              {/* Gemini 4-pointed star icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14 9L21 12L14 15L12 22L10 15L3 12L10 9L12 2Z" fill="#4285f4"/>
              </svg>
              <span className="text-base font-semibold text-[var(--client-text)]">Gemini</span>
              <span className="text-xs text-white bg-[#4285f4] px-2 py-0.5 rounded-full font-medium">2.5 Pro</span>
              <svg className="w-4 h-4 text-[var(--client-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-black/10" />

            {/* Connected UCP merchant chip */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4285f4]/[0.10] border border-[#4285f4]/20 cursor-pointer hover:bg-[#4285f4]/15 transition-colors">
              <div className="w-4 h-4 rounded-full bg-[#4285f4] flex items-center justify-center shrink-0">
                <span className="text-[7px] font-bold text-white">S</span>
              </div>
              <span className="text-xs font-medium text-[#4285f4]">StyleVault</span>
              <span className="text-[9px] text-[#4285f4]/70 font-medium">UCP</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-black/5 text-[var(--client-muted)] cursor-pointer transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <ChatSimulator
          messages={messages}
          visibleCount={visibleCount}
          theme="enterprise"
          clientName="Gemini"
          typing={typing}
          onUserTyping={handleUserTyping}
        />

        {/* Input area - Gemini pill-style */}
        <div className="px-5 pb-4 pt-3">
          <div className="rounded-[24px] bg-[var(--client-input)] border px-5 py-3.5 flex items-center gap-3 hover:bg-[#eff3f9] transition-colors">
            <button className="text-[var(--client-muted)] hover:text-[var(--client-text)] transition-colors cursor-pointer shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <span className={`flex-1 text-sm ${userTyping.typing ? "text-[var(--client-text)]" : "text-[var(--client-muted)]"}`}>
              {displayInput || "Ask Gemini"}
              {userTyping.typing && <span className="animate-pulse">|</span>}
            </span>
            <button className="text-[var(--client-muted)] hover:text-[var(--client-text)] transition-colors cursor-pointer shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 7 15.5 7 14 7.67 14 8.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.33 7 8.5 7 7 7.67 7 8.5 7.67 10 8.5 10m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5"/></svg>
            </button>
            <button className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
              sendFlash ? "bg-[#4285f4] text-white scale-90" : userTyping.typing ? "bg-[#4285f4] text-white" : "bg-[#4285f4]/10 text-[#4285f4] hover:bg-[#4285f4]/20"
            }`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" /></svg>
            </button>
          </div>
          <p className="text-[10px] text-[var(--client-muted)] text-center mt-2.5">Gemini can make mistakes. Please verify important information.</p>
        </div>
      </div>

      {/* Mock disclaimer badge */}
      <div className="absolute top-2.5 right-3 z-10">
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-semibold text-amber-700">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          SIMULATED UI / NOT ACTUAL GEMINI
        </div>
      </div>
    </div>
  );
}
