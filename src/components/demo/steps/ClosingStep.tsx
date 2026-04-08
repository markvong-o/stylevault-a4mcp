"use client";

import React from "react";
import type { SecurityEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClosingStepProps {
  securityEvents: SecurityEvent[];
  onRestart: () => void;
}

export function ClosingStep({ securityEvents, onRestart }: ClosingStepProps) {
  const consentEvents = securityEvents.filter(e => e.type === "consent");
  const cibaEvents = securityEvents.filter(e => e.type === "ciba");
  const denialEvents = securityEvents.filter(e => e.type === "scope-denial");
  const boundedEvents = securityEvents.filter(e => e.type === "bounded-authority");
  const toolCallEvents = securityEvents.filter(e => e.type === "tool-call" || e.type === "fga-check");
  const grantedCount = securityEvents.filter(e => e.result === "granted" || e.result === "approved").length;
  const deniedCount = securityEvents.filter(e => e.result === "denied").length;

  const layers = [
    {
      title: "Consent",
      description: "Users control exactly what each AI client can access",
      count: consentEvents.length,
      color: "text-emerald-600",
      border: "border-emerald-200",
    },
    {
      title: "CIBA Push Approval",
      description: "Real-time approval for sensitive actions like purchases",
      count: cibaEvents.length,
      color: "text-amber-600",
      border: "border-amber-200",
    },
    {
      title: "Token Exchange",
      description: "MCP server exchanges user tokens for scoped API tokens via Auth0",
      count: toolCallEvents.length,
      color: "text-[#4016A0]",
      border: "border-[#4016A0]/20",
    },
    {
      title: "Bounded Authority",
      description: "Hard caps prevent excessive actions, even for authorized clients",
      count: boundedEvents.length,
      color: "text-red-600",
      border: "border-red-200",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center max-w-2xl">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3">Security Summary</h2>
        <p className="text-lg text-muted-foreground">
          Auth0 secured every AI interaction with StyleVault across {securityEvents.length} security events.
        </p>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-emerald-600">{grantedCount}</p>
          <p className="text-xs text-muted-foreground">Allowed</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500">{deniedCount}</p>
          <p className="text-xs text-muted-foreground">Denied</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-[#4016A0]">{toolCallEvents.length}</p>
          <p className="text-xs text-muted-foreground">Tool Calls</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">{securityEvents.length}</p>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
        {layers.map((layer) => (
          <Card key={layer.title} className={layer.border}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-base ${layer.color}`}>{layer.title}</CardTitle>
                <Badge variant="outline">{layer.count} events</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{layer.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-2xl text-center">
        <p className="text-sm text-muted-foreground leading-relaxed">
          By securing its MCP server with Auth0, StyleVault entered the agentic commerce era as a serious contender — enabling 1st-party and 3rd-party AI clients to serve customers while maintaining complete security and user control. Faster time to market. Lower operational costs. Zero compromises on trust.
        </p>
      </div>

      <Button variant="outline" size="lg" onClick={onRestart} className="mt-4">
        Restart Demo
      </Button>
    </div>
  );
}
