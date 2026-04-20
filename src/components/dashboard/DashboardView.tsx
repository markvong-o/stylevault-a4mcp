"use client";

import { MessageSquare, Bot, Activity, Settings, Zap, Terminal, LayoutDashboard } from "lucide-react";
import { ChicletCard } from "./ChicletCard";
import { useServerPort } from "@/hooks/useServerPort";

const chiclets = [
  {
    title: "ChatGPT App Demo",
    description:
      "Walk through a ChatGPT App connecting to StyleVault. ChatGPT Apps are built on MCP servers, the same foundation that powers OpenAI's Agentic Commerce Protocol (ACP) and Instant Checkout. Auth0 handles authentication, consent, and scoped access.",
    href: "/demo/chatgpt",
    icon: MessageSquare,
    accentColor: "#10a37f",
    tag: "OpenAI",
  },
  {
    title: "Gemini Demo",
    description:
      "Walk through Gemini connecting to StyleVault via Google's Universal Commerce Protocol (UCP). A standalone REST-based commerce path with its own discovery, checkout state machine, and escalation flow. Auth0 handles identity linking, consent, and scoped access.",
    href: "/demo/gemini",
    icon: Bot,
    accentColor: "#4285f4",
    tag: "Google",
  },
  {
    title: "Live Server Logs",
    description:
      "Real-time event stream from the StyleVault server. Watch authentication flows, tool calls, and session lifecycle across both MCP and UCP as they happen.",
    href: "/logs",
    icon: Activity,
    accentColor: "#22c55e",
    tag: "Live",
  },
  {
    title: "Server Config",
    description:
      "View registered tools, Auth0 scopes, bounded authority rules, and active sessions for the running server instance.",
    href: "/config",
    icon: Settings,
    accentColor: "#4016A0",
  },
  {
    title: "Commerce Playground (UCP)",
    description:
      "Step through a real UCP commerce flow with live API calls. Discover merchant capabilities, search the catalog, create checkouts, and see bounded authority in action.",
    href: "/playground/ucp",
    icon: Zap,
    accentColor: "#f59e0b",
    tag: "Live",
  },
  {
    title: "ChatGPT App Playground",
    description:
      "Step through the MCP protocol layer that powers ChatGPT Apps. Initialize a session, discover tools, execute calls, and see bounded authority in action. MCP is the foundation for OpenAI's ACP.",
    href: "/playground/mcp",
    icon: Terminal,
    accentColor: "#10a37f",
    tag: "Live",
  },
  {
    title: "Architecture",
    description:
      "Visual architecture diagrams showing how ChatGPT Apps (MCP + ACP) and Gemini (UCP) each integrate with Auth0 as parallel paths to the same merchant.",
    href: "/architecture",
    icon: LayoutDashboard,
    accentColor: "#4016A0",
    tag: "Docs",
  },
] as const;

export function DashboardView() {
  const port = useServerPort();

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-foreground/[0.06] px-8 py-6">
        <div className="max-w-4xl mx-auto">
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground/75 mb-1">
              Experiences
            </h2>
            <p className="text-sm text-foreground/40">
              Select a demo, explore the protocol playgrounds, or monitor live server activity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chiclets.map((c) => (
              <ChicletCard key={c.href} {...c} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-foreground/[0.06] px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4 text-xs text-foreground/30">
          <span>Server: {port ? `localhost:${port}` : "discovering..."}</span>
          <span className="text-foreground/15">|</span>
          <span>Protocol: 2025-03-26</span>
          <span className="text-foreground/15">|</span>
          <span>Auth: Auth0</span>
        </div>
      </footer>
    </div>
  );
}
