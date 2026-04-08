"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CIBANotificationProps {
  action: string;
  description: string;
  approverName: string;
  onApprove: () => void;
  onDeny: () => void;
  visible: boolean;
  approved?: boolean;
}

export function CIBANotification({ action, description, approverName, onApprove, onDeny, visible, approved }: CIBANotificationProps) {
  const [waitTime, setWaitTime] = useState(0);

  useEffect(() => {
    if (!visible || approved) return;
    const interval = setInterval(() => setWaitTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [visible, approved]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm animate-in">
      <div className={`w-full max-w-sm rounded-2xl border p-6 animate-slide-up shadow-2xl ${
        approved
          ? "border-emerald-300 bg-white glow-green"
          : "border-amber-300 bg-white glow-amber"
      }`}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold text-foreground">Auth0 Guardian</span>
            <p className="text-xs text-muted-foreground">Push approval request</p>
          </div>
          {approved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}
        </div>
        <div className="mb-5">
          <p className="text-base font-medium text-foreground">{action}</p>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        {!approved ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button variant="deny" size="lg" onClick={onDeny} className="flex-1">Deny</Button>
              <Button variant="approve" size="lg" onClick={onApprove} className="flex-1">Approve</Button>
            </div>
            <div className="text-center">
              <span className="text-xs text-muted-foreground font-mono">{approverName} &middot; Waiting {waitTime}s</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-emerald-600 flex items-center justify-center gap-2 py-2">
            <span>&#10003;</span> Approved by {approverName}
          </div>
        )}
      </div>
    </div>
  );
}
