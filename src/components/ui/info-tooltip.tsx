"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
}

/**
 * Small "i" icon that shows a floating tooltip on hover.
 * Uses a portal so the card escapes ReactFlow's stacking context.
 */
export function InfoTooltip({ content, className, side = "bottom" }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: side === "bottom" ? rect.bottom + 8 : rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, [open, side]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger: small info circle */}
      <span className="w-3.5 h-3.5 rounded-full bg-foreground/[0.07] border border-foreground/[0.12] flex items-center justify-center cursor-help hover:bg-foreground/[0.12] transition-colors">
        <span className="text-[8px] font-semibold text-foreground/40 leading-none select-none">i</span>
      </span>

      {/* Tooltip card -- portalled to body so it escapes ReactFlow z-index */}
      {open && createPortal(
        <div
          className={cn(
            "fixed z-[9999] w-64 rounded-lg border border-foreground/[0.08] bg-white px-3.5 py-3 shadow-lg shadow-black/[0.06]",
            side === "bottom" ? "" : "-translate-y-full",
          )}
          style={{
            top: pos.top,
            left: pos.left,
            transform: `translateX(-50%)${side === "top" ? " translateY(-100%)" : ""}`,
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* Arrow */}
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-foreground/[0.08]",
              side === "bottom"
                ? "-top-1 border-l border-t"
                : "-bottom-1 border-r border-b",
            )}
          />
          <span className="relative block text-[11px] text-foreground/55 leading-relaxed">
            {content}
          </span>
        </div>,
        document.body,
      )}
    </span>
  );
}
