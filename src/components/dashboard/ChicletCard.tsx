"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accentColor: string;
  tag?: string;
}

export function ChicletCard({
  title,
  description,
  href,
  icon: Icon,
  accentColor,
  tag,
}: Props) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl border border-foreground/[0.06] bg-white p-6 transition-all duration-300 hover:border-foreground/[0.12] hover:shadow-lg hover:-translate-y-0.5"
      style={
        {
          "--chiclet-accent": accentColor,
        } as React.CSSProperties
      }
    >
      {/* Accent glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: `0 0 40px ${accentColor}15, 0 0 80px ${accentColor}08`,
        }}
      />

      {/* Icon */}
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300"
        style={{
          backgroundColor: `${accentColor}10`,
          color: accentColor,
        }}
      >
        <Icon size={22} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-[15px] font-semibold text-foreground/85 group-hover:text-foreground transition-colors">
            {title}
          </h3>
          {tag && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${accentColor}12`,
                color: accentColor,
              }}
            >
              {tag}
            </span>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/45">
          {description}
        </p>
      </div>

      {/* Arrow */}
      <div className="mt-4 flex items-center gap-1 text-[12px] font-medium text-foreground/30 group-hover:text-foreground/55 transition-colors">
        <span>Open</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
