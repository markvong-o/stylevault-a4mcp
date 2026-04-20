"use client";

import React from "react";

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  rightPanel: React.ReactNode;
  footer?: React.ReactNode;
}

export function PlaygroundStepLayout({ title, subtitle, children, rightPanel, footer }: Props) {
  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground/75">{title}</h2>
        <p className="text-sm text-foreground/40 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex gap-5">
        {/* Left: interactive controls */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Right: request/response */}
        <div className="w-[420px] shrink-0">
          {rightPanel}
        </div>
      </div>

      {/* Footer navigation */}
      {footer && (
        <div className="mt-6 flex items-center justify-between border-t border-foreground/[0.06] pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
