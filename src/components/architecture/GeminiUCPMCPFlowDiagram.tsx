"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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
  server: "#9C27B0",
  commerce: "#f59e0b",
  gray: "#94a3b8",
};

const TOUCHPOINTS = [
  {
    num: 1,
    title: "Unauthenticated Request + Discovery (RFC 9728)",
    description:
      "Gemini connects to the /gemini-mcp endpoint. The server returns a 401 with RFC 9728 Protected Resource Metadata, pointing Gemini to Auth0 as the authorization server.",
  },
  {
    num: 2,
    title: "Authorization Server Discovery (RFC 8414)",
    description:
      "Gemini fetches Auth0's metadata endpoint to discover token, authorization, and JWKS endpoints. Standard OAuth discovery, same mechanism used by ChatGPT in the MCP flow.",
  },
  {
    num: 3,
    title: "OAuth 2.1 + PKCE Authentication",
    description:
      "Gemini redirects the user to Auth0 Universal Login. The user authenticates and consents to scopes (read:products, execute:purchase, read:orders). PKCE ensures the authorization code cannot be intercepted.",
  },
  {
    num: 4,
    title: "Token Issuance with Bounded Authority",
    description:
      "Auth0 issues a scoped JWT with granted permissions and bounded authority claims (max_purchase_amount: $250). This same token format works regardless of whether the transport is MCP or REST.",
  },
  {
    num: 5,
    title: "Authenticated MCP Session (JSON-RPC)",
    description:
      "Gemini sends JSON-RPC requests to /gemini-mcp with the Bearer token. UCP commerce operations (catalog, checkout, orders) are exposed as MCP tools rather than REST endpoints.",
  },
  {
    num: 6,
    title: "JWT + Scope Validation (JWKS)",
    description:
      "The MCP server validates the JWT signature against Auth0's JWKS endpoint on every tool call. Scope-based access control ensures Gemini can only invoke tools matching its granted permissions.",
  },
  {
    num: 7,
    title: "On-Behalf-Of Token Exchange",
    description:
      "When a UCP tool requires downstream services (payments, shipping), the server exchanges the user's token for a narrower-scoped token via Auth0's OBO grant.",
  },
  {
    num: 8,
    title: "Bounded Authority ($250 Cap)",
    description:
      "The ucp_checkout_create tool enforces the $250 bounded authority limit. Checkouts exceeding this limit transition to 'requires_escalation' state instead of 'ready_for_complete'.",
  },
  {
    num: 9,
    title: "CIBA Escalation",
    description:
      "For escalated checkouts, the server triggers Auth0 CIBA to send a push notification to the buyer's device. The ucp_checkout_complete tool only succeeds after buyer approval.",
  },
];

function useDiagramData() {
  return useMemo(() => {
    const nodes: Node[] = [
      /* Row 1: Main actors */
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
        id: "mcp-server",
        type: "actor",
        position: { x: 700, y: 0 },
        data: {
          label: "StyleVault",
          subtitle: "UCP-over-MCP Server",
          detail: "Streamable HTTP",
          color: COLORS.server,
        },
      },

      /* Step 1 callout */
      {
        id: "callout-401",
        type: "callout",
        position: { x: 860, y: 8 },
        style: { pointerEvents: "all" },
        data: {
          step: 1,
          line1: "401 + RFC 9728",
          line2: "Resource Metadata",
          color: "#ef4444",
          tooltip: "RFC 9728 (Protected Resource Metadata) tells unauthenticated clients where to authenticate. The server returns a 401 with metadata pointing to Auth0, so Gemini knows where to send the user for login.",
        },
      },

      /* Auth0 (below-left) */
      {
        id: "auth0",
        type: "auth0",
        position: { x: 200, y: 260 },
        data: {
          capabilities: [
            "OAuth 2.1 + PKCE",
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

      /* UCP Commerce Tools (below-right, under server) */
      {
        id: "ucp-tools",
        type: "tools",
        position: { x: 680, y: 240 },
        data: {
          title: "MCP Tools (UCP Commerce)",
          items: [
            { name: "ucp_discover", scope: "Discovery" },
            { name: "ucp_catalog_search", scope: "Catalog" },
            { name: "ucp_checkout_create", scope: "Checkout" },
            { name: "ucp_checkout_complete", scope: "Checkout" },
            { name: "ucp_get_orders", scope: "Orders" },
          ],
          accentColor: COLORS.server,
          scopeColor: COLORS.google,
          footerLabel: "UCP semantics exposed as MCP tools",
        },
      },

      /* UCP Commerce Flow */
      {
        id: "ucp-commerce",
        type: "commerce",
        position: { x: 660, y: 510 },
        data: {
          title: "UCP Commerce Flow",
          subtitle: "UCP semantics over MCP transport",
          items: [
            "Manifest Discovery (ucp_discover)",
            "Catalog Search + Browse",
            "Checkout State Machine",
            "Escalation + Buyer Approval",
          ],
          color: COLORS.commerce,
        },
      },

      /* Policy nodes */
      {
        id: "bounded-auth",
        type: "policy",
        position: { x: 200, y: 540 },
        style: { pointerEvents: "all" },
        data: {
          step: 8,
          title: "Bounded Authority",
          subtitle: "$250 cap in checkout tool",
          tooltip: "The ucp_checkout_create tool reads the bounded authority limit and transitions checkouts over $250 to 'requires_escalation' state. This is the same business rule as UCP REST, enforced at the MCP tool layer.",
        },
      },
      {
        id: "ciba",
        type: "policy",
        position: { x: 200, y: 610 },
        style: { pointerEvents: "all" },
        data: {
          step: 9,
          title: "CIBA Escalation",
          subtitle: "Push approval for high-value",
          tooltip: "When ucp_checkout_complete is called for an escalated session, the server triggers Auth0 CIBA. The buyer approves via push notification, and the tool returns the completed order.",
        },
      },
    ];

    const edges: Edge[] = [
      /* User -> Gemini */
      {
        id: "e-user-gemini",
        source: "user",
        sourceHandle: "right",
        target: "gemini",
        targetHandle: "left",
        type: "label",
        data: { color: COLORS.gray },
      },

      /* Step 5: Gemini -> MCP Server (authenticated JSON-RPC) */
      {
        id: "e-gemini-mcp",
        source: "gemini",
        sourceHandle: "right",
        target: "mcp-server",
        targetHandle: "left",
        type: "step",
        data: {
          step: 5,
          label: "JSON-RPC + Bearer Token",
          color: COLORS.google,
          tooltip: "Unlike the UCP REST flow where Gemini calls separate endpoints, here Gemini sends JSON-RPC messages to a single /gemini-mcp endpoint. UCP operations are MCP tool calls.",
        },
      },

      /* Step 2: Gemini -> Auth0 (discovery) */
      {
        id: "e-gemini-auth0-discover",
        source: "gemini",
        sourceHandle: "bottom-right",
        target: "auth0",
        targetHandle: "top-right",
        type: "step",
        data: {
          step: 2,
          label: "RFC 8414 Discovery",
          color: COLORS.auth0,
          tooltip: "Gemini fetches Auth0's published configuration to learn the authorization and token endpoints. Same discovery mechanism used in the ChatGPT MCP flow.",
        },
      },

      /* Step 3: User -> Auth0 (OAuth + PKCE) */
      {
        id: "e-user-auth0",
        source: "user",
        sourceHandle: "bottom",
        target: "auth0",
        targetHandle: "top-left",
        type: "step",
        data: {
          step: 3,
          label: "OAuth 2.1 + PKCE + Consent",
          color: COLORS.auth0,
          tooltip: "The user authenticates via Auth0 Universal Login and consents to the scopes Gemini needs: product browsing, checkout, order history.",
        },
      },

      /* Step 4: Auth0 -> Gemini (token) */
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
          tooltip: "Auth0 issues a scoped JWT with bounded authority claims. Gemini attaches this token to all MCP requests.",
        },
      },

      /* Step 6: MCP Server -> Auth0 (JWKS) */
      {
        id: "e-mcp-auth0-jwks",
        source: "mcp-server",
        sourceHandle: "bottom-left",
        target: "auth0",
        targetHandle: "right-top",
        type: "step",
        data: {
          step: 6,
          label: "JWKS Validation",
          color: COLORS.auth0,
          dashed: true,
          tooltip: "On every JSON-RPC tool call, the server validates the JWT signature against Auth0's JWKS endpoint and checks the scope claims match the requested tool.",
        },
      },

      /* Step 7: UCP Tools -> Auth0 (OBO) */
      {
        id: "e-tools-auth0-obo",
        source: "ucp-tools",
        sourceHandle: "left",
        target: "auth0",
        targetHandle: "right-bottom",
        type: "step",
        data: {
          step: 7,
          label: "OBO Token Exchange",
          color: COLORS.auth0,
          dashed: true,
          tooltip: "When a UCP tool needs downstream services, the server swaps the user's token for a narrower-scoped token via Auth0's OBO grant.",
        },
      },

      /* MCP Server -> UCP Tools */
      {
        id: "e-mcp-tools",
        source: "mcp-server",
        sourceHandle: "bottom",
        target: "ucp-tools",
        targetHandle: "top",
        type: "label",
        data: { color: COLORS.gray },
      },

      /* UCP Tools -> Commerce */
      {
        id: "e-tools-commerce",
        source: "ucp-tools",
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

export function GeminiUCPMCPFlowDiagram() {
  const { nodes, edges } = useDiagramData();

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-foreground/[0.06] bg-white overflow-hidden" style={{ height: 680 }}>
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
