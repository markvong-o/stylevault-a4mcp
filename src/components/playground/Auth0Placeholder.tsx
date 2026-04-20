"use client";

import React from "react";

interface Props {
  title: string;
  description: string;
  variant?: "info" | "action";
}

export function Auth0Placeholder({ title, description, variant = "info" }: Props) {
  const isAction = variant === "action";

  return (
    <div className={`rounded-lg border-2 border-dashed px-4 py-3.5 ${
      isAction
        ? "border-primary/25 bg-primary/[0.03]"
        : "border-amber-500/25 bg-amber-500/[0.03]"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isAction ? "bg-primary/10" : "bg-amber-500/10"
        }`}>
          {isAction ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4016A0" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-semibold ${isAction ? "text-primary" : "text-amber-600"}`}>
              {title}
            </span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/[0.08] text-primary border border-primary/15">
              Auth0 Integration Point
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-foreground/45">{description}</p>
        </div>
      </div>
    </div>
  );
}
