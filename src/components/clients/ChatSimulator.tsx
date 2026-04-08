"use client";

import React, { useRef, useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSimulatorProps {
  messages: ChatMessage[];
  visibleCount: number;
  theme: "dark" | "enterprise";
  clientName: string;
  typing?: boolean;
  onUserTyping?: (state: { typing: boolean; text: string; done: boolean }) => void;
}

function TypingIndicator({ theme }: { theme: string }) {
  const dotColor = "bg-black/20";
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className={`w-2 h-2 rounded-full ${dotColor} typing-dot`} />
      <div className={`w-2 h-2 rounded-full ${dotColor} typing-dot`} />
      <div className={`w-2 h-2 rounded-full ${dotColor} typing-dot`} />
    </div>
  );
}

function useThinkingDelay(trigger: boolean, delayMs: number = 1500) {
  const [thinking, setThinking] = useState(trigger);
  useEffect(() => {
    if (!trigger) { setThinking(false); return; }
    setThinking(true);
    const timer = setTimeout(() => setThinking(false), delayMs);
    return () => clearTimeout(timer);
  }, [trigger, delayMs]);
  return thinking;
}

function statusColor(status: string) {
  if (status === "success") return { dot: "bg-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400" };
  if (status === "denied") return { dot: "bg-red-500", border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400" };
  return { dot: "bg-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400" };
}

function ToolCallBadge({ toolCall }: { toolCall: NonNullable<ChatMessage["toolCall"]> }) {
  const [expanded, setExpanded] = useState(false);
  const colors = statusColor(toolCall.status);
  const hasSteps = toolCall.steps && toolCall.steps.length > 0;

  return (
    <div className={`mb-2 text-xs rounded border overflow-hidden ${colors.border} ${colors.bg}`}>
      <button
        onClick={() => hasSteps && setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2 py-1 w-full text-left ${colors.text} ${hasSteps ? "cursor-pointer hover:opacity-80" : ""}`}
      >
        <span className="flex-1">
          {toolCall.name}: {toolCall.status}
          {toolCall.detail && ` / ${toolCall.detail}`}
        </span>
        {hasSteps && (
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>
      {expanded && toolCall.steps && (
        <div className="px-2 pb-2 pt-1 border-t border-current/10">
          {toolCall.steps.map((step, i) => {
            const sc = statusColor(step.status);
            const isLast = i === toolCall.steps!.length - 1;
            return (
              <div key={i} className="flex items-start gap-2 relative">
                <div className="flex flex-col items-center shrink-0 w-3">
                  <div className={`w-2 h-2 rounded-full mt-1 ${sc.dot}`} />
                  {!isLast && <div className="w-px flex-1 min-h-[12px] bg-current/15" />}
                </div>
                <div className="pb-1.5">
                  <span className="font-medium text-[var(--client-text)]/70">{step.label}</span>
                  <span className="text-[var(--client-text)]/40 ml-1">{step.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, theme, isLatest }: { message: ChatMessage; theme: string; isLatest: boolean }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const isThinking = useThinkingDelay(isLatest && message.role === "assistant");

  const content = message.content;

  if (isSystem) {
    return (
      <div className="flex justify-center my-3 animate-in">
        <span className="text-xs italic px-3 py-1 rounded-full bg-black/[0.04] text-black/40">{content}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2 animate-in`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-[var(--client-user-bubble)] text-[var(--client-text)]"
          : "bg-black/[0.04] text-[var(--client-text)]"
      }`}>
        {isThinking ? (
          <TypingIndicator theme={theme} />
        ) : (
          <>
            {message.toolCall && <ToolCallBadge toolCall={message.toolCall} />}
            <span className="whitespace-pre-line">{content}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ChatSimulator({ messages, visibleCount, theme, clientName, typing, onUserTyping }: ChatSimulatorProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.slice(0, visibleCount);
  const lastMsg = visibleMessages[visibleMessages.length - 1];
  const isUserLatest = lastMsg?.role === "user";

  // User typing animation state
  const [userTypingPhase, setUserTypingPhase] = useState<"idle" | "typing" | "sent">("idle");
  const [typedText, setTypedText] = useState("");
  const typingMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isUserLatest || !lastMsg) {
      if (userTypingPhase !== "idle") {
        setUserTypingPhase("idle");
        setTypedText("");
        typingMsgIdRef.current = null;
        onUserTyping?.({ typing: false, text: "", done: false });
      }
      return;
    }
    // Don't re-trigger for the same message
    if (typingMsgIdRef.current === lastMsg.id) return;
    typingMsgIdRef.current = lastMsg.id;

    const text = lastMsg.content;
    setUserTypingPhase("typing");
    setTypedText("");
    onUserTyping?.({ typing: true, text: "", done: false });

    let i = 0;
    const speed = Math.max(40, Math.min(70, 2500 / text.length)); // adaptive speed
    const interval = setInterval(() => {
      i++;
      const partial = text.slice(0, i);
      setTypedText(partial);
      onUserTyping?.({ typing: true, text: partial, done: false });
      if (i >= text.length) {
        clearInterval(interval);
        // Brief pause then "send"
        setTimeout(() => {
          setUserTypingPhase("sent");
          onUserTyping?.({ typing: false, text: "", done: true });
          // Reset done flag after a tick
          setTimeout(() => onUserTyping?.({ typing: false, text: "", done: false }), 100);
        }, 1000);
      }
    }, speed);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMsg?.id, isUserLatest]);

  // Hide the last user message bubble while typing it into the input
  const showMessages = userTypingPhase === "sent" || !isUserLatest
    ? visibleMessages
    : visibleMessages.slice(0, -1);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.scrollIntoView({ block: "end" });
    });
    const container = el.parentElement;
    if (container) {
      observer.observe(container, { childList: true, subtree: true, characterData: true });
    }
    el.scrollIntoView({ block: "end" });
    return () => observer.disconnect();
  }, [visibleCount, userTypingPhase]);

  return (
    <ScrollArea className="flex-1 min-h-0 px-4 py-4">
      {showMessages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          theme={theme}
          isLatest={idx === showMessages.length - 1}
        />
      ))}
      {typing && <TypingIndicator theme={theme} />}
      <div ref={bottomRef} />
    </ScrollArea>
  );
}
