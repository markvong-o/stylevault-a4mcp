"use client";

import React from "react";
import type { ScopeDescription } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

interface ConsentScreenProps {
  clientName: string;
  productName: string;
  scopes: ScopeDescription[];
  onApprove: () => void;
  onDeny: () => void;
  visible: boolean;
}

const SCOPE_ICONS: Record<string, React.ReactNode> = {
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  package: <><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  sliders: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></>,
  "shopping-cart": <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
};

export function ConsentScreen({ clientName, productName, scopes, onApprove, onDeny, visible }: ConsentScreenProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm animate-in">
      <Card className="w-full max-w-md border-primary/20 animate-slide-up bg-white shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <CardTitle className="text-xl">
            <span className="font-bold">{clientName}</span> wants to access your{" "}
            <span className="font-bold">{productName}</span> account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">This will allow {clientName} to:</p>
          <ul className="space-y-3">
            {scopes.map((scope) => (
              <li key={scope.scope} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {SCOPE_ICONS[scope.icon] ?? <><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></>}
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium">{scope.label}</div>
                  <div className="text-xs text-muted-foreground">{scope.scope}</div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onDeny}>Deny</Button>
          <Button onClick={onApprove}>Approve</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
