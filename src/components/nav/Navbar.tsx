"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "ChatGPT App Demo", href: "/demo/chatgpt" },
  { label: "Gemini Demo", href: "/demo/gemini" },
  { label: "Commerce Playground", href: "/playground/ucp" },
  { label: "ChatGPT App Playground", href: "/playground/mcp" },
  { label: "Logs", href: "/logs" },
  { label: "Config", href: "/config" },
  { label: "Architecture", href: "/architecture" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <nav className="shrink-0 flex items-center justify-between border-b border-foreground/[0.06] bg-white/80 backdrop-blur-md px-6 h-12 z-50">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4016A0] to-[#B49BFC] flex items-center justify-center">
          <span className="text-[11px] font-bold text-white">SV</span>
        </div>
        <span className="font-display italic text-[15px] text-foreground/70">
          StyleVault
        </span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-0.5">
        {NAV_ITEMS.map(({ label, href }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`text-[12px] px-3 py-1.5 rounded-md transition-colors ${
                active
                  ? "bg-primary/[0.08] text-primary font-medium"
                  : "text-foreground/40 hover:text-foreground/65 hover:bg-foreground/[0.03]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
