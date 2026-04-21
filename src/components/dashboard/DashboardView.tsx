"use client";

import { MessageSquare, Bot, LayoutDashboard, Sparkles } from "lucide-react";
import { ChicletCard } from "./ChicletCard";

const SECTIONS = [
  {
    title: "Demos",
    subtitle: "Guided walkthroughs showing each agent platform connecting to StyleVault through Auth0.",
    items: [
      {
        title: "ChatGPT App",
        description:
          "Walk through a ChatGPT App connecting to StyleVault. ChatGPT Apps are built on MCP servers, the same foundation that powers OpenAI's ACP and Instant Checkout.",
        href: "/demo/chatgpt",
        icon: MessageSquare,
        accentColor: "#10a37f",
        tag: "OpenAI",
      },
      {
        title: "Gemini (UCP)",
        description:
          "Walk through Gemini connecting to StyleVault via Google's Universal Commerce Protocol (UCP). REST-based commerce with its own discovery, checkout state machine, and escalation flow.",
        href: "/demo/gemini",
        icon: Bot,
        accentColor: "#4285f4",
        tag: "Google",
      },
      {
        title: "Gemini (UCP-over-MCP)",
        description:
          "Walk through Gemini using UCP commerce semantics over MCP transport. Same checkout state machine and escalation, delivered as JSON-RPC tool calls.",
        href: "/demo/gemini-mcp",
        icon: Sparkles,
        accentColor: "#9C27B0",
        tag: "Google",
      },
    ],
  },
  {
    title: "Admin",
    subtitle: "Server monitoring, configuration, and architecture reference.",
    items: [
      {
        title: "Architecture",
        description:
          "Visual architecture diagrams showing how ChatGPT Apps (MCP), Gemini (UCP), and Gemini (UCP-over-MCP) each integrate with Auth0.",
        href: "/architecture",
        icon: LayoutDashboard,
        accentColor: "#4016A0",
        tag: "Docs",
      },
    ],
  },
] as const;

export function DashboardView() {

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-foreground/[0.06] px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display italic text-2xl text-foreground/85">
            StyleVault
          </h1>
          <p className="text-sm text-foreground/40 mt-1">
            Auth0 Agentic Security Demo - Dashboard
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground/75 mb-0.5">
                  {section.title}
                </h2>
                <p className="text-sm text-foreground/40">
                  {section.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((c) => (
                  <ChicletCard key={c.href} {...c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-foreground/[0.06] px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4 text-xs text-foreground/30">
          <span>Protocol: 2025-03-26</span>
          <span className="text-foreground/15">|</span>
          <span>Auth: Auth0</span>
        </div>
      </footer>
    </div>
  );
}
