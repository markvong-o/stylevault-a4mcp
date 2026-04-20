"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";

const COLORS = {
  user: "#1a1a2e",
  google: "#4285f4",
  auth0: "#4016A0",
  server: "#6d28d9",
  commerce: "#f59e0b",
  gray: "#94a3b8",
};

const TOUCHPOINTS = [
  {
    num: 1,
    title: "UCP Manifest Discovery",
    description:
      "Gemini fetches /.well-known/ucp from StyleVault to discover capabilities, supported actions, and the authorization server URL (Auth0).",
  },
  {
    num: 2,
    title: "Auth Server Discovery",
    description:
      "Gemini reads the authorization server URL from the UCP manifest and fetches Auth0's metadata endpoint to discover token, authorization, and JWKS endpoints.",
  },
  {
    num: 3,
    title: "Identity Linking + Consent",
    description:
      "Gemini redirects the user to Auth0 Universal Login to link their Google identity to their StyleVault account. The user approves scopes for catalog access, checkout, and order management.",
  },
  {
    num: 4,
    title: "Token Issuance",
    description:
      "Auth0 issues a scoped access token (JWT) back to Gemini. The token contains granted scopes, the linked identity, and bounded authority claims.",
  },
  {
    num: 5,
    title: "Authenticated UCP API Calls",
    description:
      "Gemini sends REST API requests to StyleVault's UCP endpoints with the Bearer token. Every API call includes the token for validation.",
  },
  {
    num: 6,
    title: "JWT + Scope Validation (JWKS)",
    description:
      "The merchant server validates the JWT signature against Auth0's JWKS endpoint and enforces scope-based access control on every UCP API call.",
  },
  {
    num: 7,
    title: "OBO Token Exchange",
    description:
      "When a UCP action requires downstream services (payments, shipping), the merchant server exchanges the user's token with Auth0 for a narrower-scoped token via the OBO grant.",
  },
  {
    num: 8,
    title: "Checkout State Machine",
    description:
      "UCP checkout sessions follow a state machine: created, requires_escalation, completed. The merchant enforces a $250 cap and transitions to escalation when exceeded.",
  },
  {
    num: 9,
    title: "CIBA Escalation",
    description:
      "For checkout sessions exceeding bounded authority, the merchant server triggers Auth0 CIBA to send a push notification to the buyer's device. The session resumes only after explicit approval.",
  },
];

function useDiagramData() {
  return useMemo(() => {
    const nodes: Node[] = [
      /* ─ Row 1: Main actors (wide spacing) ─ */
      {
        id: "user",
        type: "actor",
        position: { x: 0, y: 0 },
        data: { label: "User", subtitle: "Browser / Mobile", color: COLORS.user },
      },
      {
        id: "gemini",
        type: "actor",
        position: { x: 300, y: 0 },
        data: {
          label: "Gemini",
          subtitle: "Google Platform",
          detail: "AI Shopping Agent",
          color: COLORS.google,
        },
      },
      {
        id: "ucp-merchant",
        type: "actor",
        position: { x: 700, y: 0 },
        data: {
          label: "StyleVault",
          subtitle: "UCP Merchant",
          detail: "REST API",
          color: COLORS.server,
        },
      },

      /* ─ Step 1 callout (blue: UCP discovery is manifest-based, not a 401) ─ */
      {
        id: "callout-ucp",
        type: "callout",
        position: { x: 860, y: 8 },
        style: { pointerEvents: "all" },
        data: {
          step: 1,
          line1: "/.well-known/ucp",
          line2: "Discovery Manifest",
          color: COLORS.google,
          tooltip: "Gemini reads a public configuration file from StyleVault that lists what the store can do (search products, create checkouts, etc.) and where to authenticate. Like scanning a menu before ordering.",
        },
      },

      /* ─ Auth0 (below-left, side-channel) ─ */
      {
        id: "auth0",
        type: "auth0",
        position: { x: 200, y: 260 },
        data: {
          capabilities: [
            "Identity Linking (OAuth)",
            "Universal Login",
            "Consent + Scopes",
            "Token Issuance (JWT)",
            "JWKS Endpoint",
            "OBO Token Exchange",
            "Bounded Authority Claims",
            "CIBA Escalation",
          ],
        },
      },

      /* ─ UCP Endpoints (below-right, under merchant) ─ */
      {
        id: "ucp-endpoints",
        type: "tools",
        position: { x: 680, y: 240 },
        data: {
          title: "UCP Endpoints",
          items: [
            { name: "/.well-known/ucp", scope: "Discovery" },
            { name: "/ucp/v1/catalog/search", scope: "Catalog" },
            { name: "/ucp/v1/checkout/sessions", scope: "Checkout" },
            { name: "/ucp/v1/orders", scope: "Orders" },
          ],
          accentColor: COLORS.server,
          scopeColor: COLORS.google,
          footerLabel: "Merchant enforces scopes via JWT claims",
        },
      },

      /* ─ UCP Commerce Flow ─ */
      {
        id: "ucp-commerce",
        type: "commerce",
        position: { x: 660, y: 490 },
        data: {
          title: "UCP Commerce Flow",
          subtitle: "Universal Commerce Protocol (Google)",
          items: [
            "Merchant Discovery + Manifest",
            "Catalog Search + Browse",
            "Checkout Session State Machine",
            "Payment Authorization",
          ],
          color: COLORS.commerce,
        },
      },

      /* ─ Policy nodes ─ */
      {
        id: "bounded-auth",
        type: "policy",
        position: { x: 200, y: 520 },
        style: { pointerEvents: "all" },
        data: {
          step: 8,
          title: "Checkout State Machine",
          subtitle: "$250 cap, escalation on exceed",
          tooltip: "UCP checkouts move through defined states: created, requires_escalation, completed. If the total exceeds $250, the checkout pauses in an escalation state instead of going through automatically.",
        },
      },
      {
        id: "ciba",
        type: "policy",
        position: { x: 200, y: 590 },
        style: { pointerEvents: "all" },
        data: {
          step: 9,
          title: "CIBA Escalation",
          subtitle: "Push approval for high-value",
          tooltip: "When a checkout is paused for escalation, you get a push notification on your phone. The purchase only completes after you explicitly approve it. No silent charges.",
        },
      },
    ];

    const edges: Edge[] = [
      /* User -> Gemini (unlabeled) */
      {
        id: "e-user-gemini",
        source: "user",
        sourceHandle: "right",
        target: "gemini",
        targetHandle: "left",
        type: "label",
        data: { color: COLORS.gray },
      },

      /* Step 5: Gemini -> UCP Merchant (authenticated) */
      {
        id: "e-gemini-ucp",
        source: "gemini",
        sourceHandle: "right",
        target: "ucp-merchant",
        targetHandle: "left",
        type: "step",
        data: {
          step: 5,
          label: "REST API + Bearer Token",
          color: COLORS.google,
          tooltip: "UCP uses standard REST: each action has its own endpoint (e.g. /catalog/search, /checkout/sessions). This is the traditional API pattern, unlike MCP's single-endpoint JSON-RPC approach.",
        },
      },

      /* Step 2: Gemini -> Auth0 (auth server discovery) */
      {
        id: "e-gemini-auth0-discover",
        source: "gemini",
        sourceHandle: "bottom-right",
        target: "auth0",
        targetHandle: "top-right",
        type: "step",
        data: {
          step: 2,
          label: "Auth Server Discovery",
          color: COLORS.auth0,
          tooltip: "The UCP manifest tells Gemini that Auth0 handles logins for StyleVault. Gemini fetches Auth0's configuration to learn where to send you for authentication.",
        },
      },

      /* Step 3: User -> Auth0 (identity linking + consent) */
      {
        id: "e-user-auth0",
        source: "user",
        sourceHandle: "bottom",
        target: "auth0",
        targetHandle: "top-left",
        type: "step",
        data: {
          step: 3,
          label: "Identity Linking + Consent",
          color: COLORS.auth0,
          tooltip: "You log in through Auth0 and connect your Google identity to your StyleVault account. You also approve what Gemini can do: browse products, start checkouts, view orders, etc.",
        },
      },

      /* Step 4: Auth0 -> Gemini (token return) */
      {
        id: "e-auth0-gemini-token",
        source: "auth0",
        sourceHandle: "left",
        target: "gemini",
        targetHandle: "bottom-in",
        type: "step",
        data: {
          step: 4,
          label: "Access Token (JWT)",
          color: COLORS.auth0,
          dashed: true,
          tooltip: "Auth0 gives Gemini a signed digital pass that proves who you are, what you approved, and how much it can spend. Gemini attaches this pass to every request it makes to StyleVault.",
        },
      },

      /* Step 6: UCP Merchant -> Auth0 (JWKS validation) */
      {
        id: "e-ucp-auth0-jwks",
        source: "ucp-merchant",
        sourceHandle: "bottom-left",
        target: "auth0",
        targetHandle: "right-top",
        type: "step",
        data: {
          step: 6,
          label: "JWKS Validation",
          color: COLORS.auth0,
          dashed: true,
          tooltip: "Every time Gemini calls a UCP endpoint, the merchant server checks the token's signature with Auth0 to confirm it's genuine and that the requested action is within the approved permissions.",
        },
      },

      /* Step 7: UCP Endpoints -> Auth0 (OBO token exchange) */
      {
        id: "e-endpoints-auth0-obo",
        source: "ucp-endpoints",
        sourceHandle: "left",
        target: "auth0",
        targetHandle: "right-bottom",
        type: "step",
        data: {
          step: 7,
          label: "OBO Token Exchange",
          color: COLORS.auth0,
          dashed: true,
          tooltip: "When the merchant needs to charge your card or arrange shipping, it swaps your token for a new, narrower one scoped to just that service. Your broad access stays at the merchant level and never leaks downstream.",
        },
      },

      /* UCP Merchant -> Endpoints (straight down) */
      {
        id: "e-merchant-endpoints",
        source: "ucp-merchant",
        sourceHandle: "bottom",
        target: "ucp-endpoints",
        targetHandle: "top",
        type: "label",
        data: { color: COLORS.gray },
      },

      /* Endpoints -> Commerce */
      {
        id: "e-endpoints-commerce",
        source: "ucp-endpoints",
        sourceHandle: "bottom",
        target: "ucp-commerce",
        targetHandle: "top",
        type: "label",
        data: { color: COLORS.gray },
      },

      /* Bounded Auth -> Commerce */
      {
        id: "e-bounded-commerce",
        source: "bounded-auth",
        sourceHandle: "right",
        target: "ucp-commerce",
        targetHandle: "left-top",
        type: "step",
        data: { color: COLORS.auth0, dashed: true },
      },

      /* CIBA -> Commerce */
      {
        id: "e-ciba-commerce",
        source: "ciba",
        sourceHandle: "right",
        target: "ucp-commerce",
        targetHandle: "left-bottom",
        type: "step",
        data: { color: COLORS.auth0, dashed: true },
      },
    ];

    return { nodes, edges };
  }, []);
}

export function GeminiFlowDiagram() {
  const { nodes, edges } = useDiagramData();

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-foreground/[0.06] bg-white overflow-hidden" style={{ height: 640 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background gap={20} size={1} color="rgba(0,0,0,0.03)" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "auth0") return COLORS.auth0;
              if (n.type === "commerce") return COLORS.commerce;
              if (n.type === "policy") return `${COLORS.auth0}40`;
              if (n.id === "gemini") return COLORS.google;
              if (n.id === "ucp-merchant" || n.id === "ucp-endpoints") return COLORS.server;
              return COLORS.user;
            }}
            maskColor="rgba(255,255,255,0.8)"
            position="bottom-left"
          />
        </ReactFlow>
      </div>

      {/* Auth0 Security Touchpoints */}
      <div className="rounded-xl border border-foreground/[0.06] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4016A0" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground/70">Auth0 Security Touchpoints</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TOUCHPOINTS.map((tp) => (
            <div key={tp.num} className="flex gap-3 p-3 rounded-lg bg-foreground/[0.015] border border-foreground/[0.04]">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                {tp.num}
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground/65">{tp.title}</p>
                <p className="text-[11px] text-foreground/40 leading-relaxed mt-0.5">{tp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
