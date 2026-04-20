"use client";

import React, { useState, useEffect } from "react";
import type { SecurityEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface ClosingStepProps {
  securityEvents: SecurityEvent[];
  onRestart: () => void;
}

export function ClosingStep({ securityEvents, onRestart }: ClosingStepProps) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealed(1), 300),
      setTimeout(() => setRevealed(2), 800),
      setTimeout(() => setRevealed(3), 1300),
      setTimeout(() => setRevealed(4), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const consentEvents = securityEvents.filter(e => e.type === "consent");
  const cibaEvents = securityEvents.filter(e => e.type === "ciba");
  const denialEvents = securityEvents.filter(e => e.type === "scope-denial");
  const boundedEvents = securityEvents.filter(e => e.type === "bounded-authority");
  const toolCallEvents = securityEvents.filter(e => e.type === "tool-call" || e.type === "fga-check" || e.type === "ucp-payment-auth");
  const grantedCount = securityEvents.filter(e => e.result === "granted" || e.result === "approved").length;
  const deniedCount = securityEvents.filter(e => e.result === "denied").length;

  const mcpDiscoveryEvents = securityEvents.filter(e => e.type === "mcp-discovery" || e.type === "mcp-dcr");
  const ucpDiscoveryEvents = securityEvents.filter(e => e.type === "ucp-discovery");
  const ucpCheckoutEvents = securityEvents.filter(e => e.type === "ucp-checkout-state");

  const layers = [
    {
      title: "Consent",
      description: "Users control exactly what each AI client can access",
      count: consentEvents.length,
      color: "text-emerald-600",
      accentBorder: "border-l-emerald-500/50",
    },
    {
      title: "CIBA Push Approval",
      description: "Real-time approval for sensitive actions like purchases",
      count: cibaEvents.length,
      color: "text-amber-600",
      accentBorder: "border-l-amber-500/50",
    },
    {
      title: "Token Exchange",
      description: "The server exchanges user tokens for scoped API tokens via Auth0, regardless of protocol",
      count: toolCallEvents.length,
      color: "text-primary",
      accentBorder: "border-l-primary/50",
    },
    {
      title: "Bounded Authority",
      description: "Hard caps prevent excessive actions, even for authorized clients",
      count: boundedEvents.length,
      color: "text-red-600",
      accentBorder: "border-l-red-500/50",
    },
    ...(mcpDiscoveryEvents.length > 0 ? [{
      title: "MCP Discovery + DCR",
      description: "Agents discover server metadata, authorization requirements, and register dynamically via Auth0",
      count: mcpDiscoveryEvents.length,
      color: "text-indigo-600",
      accentBorder: "border-l-indigo-500/50",
    }] : []),
    ...(ucpDiscoveryEvents.length > 0 ? [{
      title: "UCP Discovery",
      description: "Agents discover merchant capabilities via /.well-known/ucp and negotiate supported features",
      count: ucpDiscoveryEvents.length,
      color: "text-blue-600",
      accentBorder: "border-l-blue-500/50",
    }] : []),
    ...(ucpCheckoutEvents.length > 0 ? [{
      title: "UCP Checkout States",
      description: "Checkout sessions follow a secure state machine with escalation for high-value purchases",
      count: ucpCheckoutEvents.length,
      color: "text-orange-600",
      accentBorder: "border-l-orange-500/50",
    }] : []),
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <div className={`relative z-10 text-center max-w-2xl transition-all duration-700 ${revealed >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h2 className="text-3xl font-[family-name:var(--font-display)] italic text-foreground mb-3">Security Summary</h2>
        <p className="text-lg text-muted-foreground">
          Auth0 secured every AI interaction with StyleVault across {securityEvents.length} security events.
        </p>
      </div>

      {/* Stats */}
      <div className={`relative z-10 flex items-center gap-8 transition-all duration-700 ${revealed >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="text-center">
          <p className="text-3xl font-[family-name:var(--font-display)] italic text-emerald-600">{grantedCount}</p>
          <p className="text-xs text-muted-foreground">Allowed</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-[family-name:var(--font-display)] italic text-red-500">{deniedCount}</p>
          <p className="text-xs text-muted-foreground">Denied</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-[family-name:var(--font-display)] italic text-primary">{toolCallEvents.length}</p>
          <p className="text-xs text-muted-foreground">Tool Calls</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-[family-name:var(--font-display)] italic text-foreground">{securityEvents.length}</p>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
      </div>

      {/* Layer cards */}
      <div className={`relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl w-full transition-all duration-700 ${revealed >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        {layers.map((layer) => (
          <div
            key={layer.title}
            className={`rounded-lg border border-black/[0.06] bg-black/[0.01] p-4 border-l-2 ${layer.accentBorder} hover:bg-black/[0.03] transition-colors`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${layer.color}`}>{layer.title}</span>
              <Badge variant="outline">{layer.count} events</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{layer.description}</p>
          </div>
        ))}
      </div>

      {/* Closing copy + restart */}
      <div className={`relative z-10 max-w-2xl text-center transition-all duration-700 ${revealed >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Auth0 gave StyleVault a single security layer across two parallel integration paths. MCP powers the ChatGPT App and lays the foundation for OpenAI&apos;s Agentic Commerce Protocol (ACP) and Instant Checkout. UCP powers the Gemini commerce integration with its own discovery, checkout state machine, and escalation flow. Two protocols, same Auth0 identity, consent, and authorization guarantees. One security platform. Faster time to market. Lower operational costs.
        </p>
        <button
          onClick={onRestart}
          className="group relative px-8 py-3 rounded-full text-sm font-medium text-foreground/60 border border-foreground/10 hover:border-foreground/20 hover:text-foreground hover:bg-foreground/5 transition-all duration-300 cursor-pointer"
        >
          Restart Demo
        </button>
      </div>
    </div>
  );
}
