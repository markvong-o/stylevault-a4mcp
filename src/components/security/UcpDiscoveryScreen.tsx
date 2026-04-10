"use client";

import React from "react";

interface UcpDiscoveryScreenProps {
  merchantName: string;
  capabilities: string[];
  manifestUrl: string;
  onAuthorize: () => void;
  onDeny: () => void;
  visible: boolean;
}

const CAPABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  "dev.ucp.shopping.checkout": { label: "Checkout", icon: "shopping-cart" },
  "dev.ucp.shopping.catalog": { label: "Product Catalog", icon: "search" },
  "dev.ucp.shopping.orders": { label: "Order Management", icon: "package" },
  "dev.ucp.shopping.identity": { label: "Identity Linking", icon: "user" },
};

function CapabilityIcon({ type }: { type: string }) {
  const iconName = CAPABILITY_LABELS[type]?.icon || "box";
  switch (iconName) {
    case "shopping-cart":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
    case "search":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case "package":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case "user":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    default:
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>;
  }
}

export function UcpDiscoveryScreen({ merchantName, capabilities, manifestUrl, onAuthorize, onDeny, visible }: UcpDiscoveryScreenProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in">
      <div className="w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#4285f4]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285f4" opacity="0.8"/>
                <path d="M2 17l10 5 10-5" stroke="#4285f4" strokeWidth="2" fill="none"/>
                <path d="M2 12l10 5 10-5" stroke="#4285f4" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">UCP Merchant Discovery</h3>
              <p className="text-sm text-gray-500">Gemini discovered {merchantName}'s commerce capabilities</p>
            </div>
          </div>
        </div>

        {/* Manifest preview */}
        <div className="px-6 py-4">
          <div className="mb-3">
            <span className="text-xs font-mono text-gray-400">{manifestUrl}</span>
          </div>

          <div className="bg-gray-50 rounded-lg border p-4 mb-4">
            <pre className="text-xs font-mono text-gray-700 leading-relaxed overflow-x-auto">
{`{
  "name": "${merchantName}",
  "ucp_version": "2026-04-08",
  "capabilities": [
${capabilities.map(c => `    "${c}"`).join(",\n")}
  ],
  "auth": {
    "type": "oauth2",
    "issuer": "https://stylevault.us.auth0.com"
  }
}`}
            </pre>
          </div>

          {/* Capability list */}
          <p className="text-sm font-medium text-gray-700 mb-3">Available capabilities:</p>
          <div className="space-y-2 mb-4">
            {capabilities.map((cap) => {
              const info = CAPABILITY_LABELS[cap] || { label: cap, icon: "box" };
              return (
                <div key={cap} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border">
                  <div className="w-8 h-8 rounded-md bg-[#4285f4]/10 flex items-center justify-center text-[#4285f4]">
                    <CapabilityIcon type={cap} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-800">{info.label}</span>
                    <span className="text-xs text-gray-400 ml-2 font-mono">{cap}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Auth0 will validate the agent's identity and issue scoped tokens for each capability. The merchant's Auth0 tenant controls access policies.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onAuthorize}
            className="flex-1 py-2.5 rounded-lg bg-[#4285f4] text-white font-medium text-sm hover:bg-[#3367d6] transition-colors cursor-pointer"
          >
            Authorize Agent
          </button>
          <button
            onClick={onDeny}
            className="flex-1 py-2.5 rounded-lg border text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
