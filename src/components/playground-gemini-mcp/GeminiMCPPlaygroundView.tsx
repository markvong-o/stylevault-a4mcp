"use client";

import React from "react";
import { useServerPort, serverUrls } from "@/hooks/useServerPort";
import { useGeminiMCPPlaygroundState } from "@/hooks/useGeminiMCPPlaygroundState";
import { Step1Init } from "./steps/Step1Init";
import { Step2Discover } from "./steps/Step2Discover";
import { Step3Browse } from "./steps/Step3Browse";
import { Step4Checkout } from "./steps/Step4Checkout";
import { Step5Complete } from "./steps/Step5Complete";
import { Step6Cleanup } from "./steps/Step6Cleanup";

const STEPS = [
  { num: 1, label: "Initialize" },
  { num: 2, label: "Discover" },
  { num: 3, label: "Browse" },
  { num: 4, label: "Checkout" },
  { num: 5, label: "Complete" },
  { num: 6, label: "Cleanup" },
];

export function GeminiMCPPlaygroundView() {
  const port = useServerPort();
  const {
    state, goToStep, setSearchQuery, selectProduct, setQuantity,
    setEscalationToken, reset,
    initializeSession, listTools, discoverUCP, searchCatalog,
    getProductDetails, createCheckout, completeCheckout, cleanupSession,
  } = useGeminiMCPPlaygroundState();

  const baseUrl = port ? serverUrls(port).api : null;

  if (!port) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground/30">Connecting to UCP-over-MCP server...</p>
          <p className="text-xs text-foreground/20 mt-1">Probing ports 3001-3010</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    if (!baseUrl) return null;
    switch (state.step) {
      case 1:
        return (
          <Step1Init
            state={state}
            onInit={() => initializeSession(baseUrl)}
            onNext={() => goToStep(2)}
          />
        );
      case 2:
        return (
          <Step2Discover
            state={state}
            onDiscover={() => {
              if (state.sessionId) discoverUCP(baseUrl, state.sessionId);
            }}
            onListTools={() => {
              if (state.sessionId) listTools(baseUrl, state.sessionId);
            }}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        );
      case 3:
        return (
          <Step3Browse
            state={state}
            onSearchQueryChange={setSearchQuery}
            onSearch={() => {
              if (state.sessionId) searchCatalog(baseUrl, state.sessionId, state.searchQuery);
            }}
            onSelectProduct={(product) => {
              selectProduct(product);
              if (state.sessionId) getProductDetails(baseUrl, state.sessionId, product.id);
            }}
            onQuantityChange={setQuantity}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        );
      case 4:
        return (
          <Step4Checkout
            state={state}
            onCreateCheckout={() => {
              if (state.sessionId && state.selectedProduct) {
                createCheckout(baseUrl, state.sessionId, state.selectedProduct.id, state.quantity);
              }
            }}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        );
      case 5:
        return (
          <Step5Complete
            state={state}
            onApproveEscalation={() => {
              if (state.checkoutSession) {
                setEscalationToken(`mock-ciba-token-${state.checkoutSession.session_id}`);
              }
            }}
            onComplete={() => {
              if (state.sessionId && state.checkoutSession) {
                completeCheckout(
                  baseUrl,
                  state.sessionId,
                  state.checkoutSession.session_id,
                  state.escalationToken
                );
              }
            }}
            onNext={() => goToStep(6)}
            onBack={() => goToStep(4)}
          />
        );
      case 6:
        return (
          <Step6Cleanup
            state={state}
            onCleanup={() => {
              if (state.sessionId) cleanupSession(baseUrl, state.sessionId);
            }}
            onReset={reset}
            onBack={() => goToStep(5)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-foreground/[0.06] px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-foreground/80">Gemini UCP-over-MCP Playground</h1>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <p className="text-xs text-foreground/35 mt-0.5">
              UCP commerce semantics transported over MCP protocol. Live calls on port {port}
            </p>
          </div>

          <button
            onClick={reset}
            className="text-xs text-foreground/35 hover:text-foreground/60 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-foreground/[0.03] border border-transparent hover:border-foreground/[0.08]"
          >
            Start Over
          </button>
        </div>
      </header>

      {/* Step indicator */}
      <div className="shrink-0 border-b border-foreground/[0.04] px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1">
          {STEPS.map((s, i) => {
            const isCurrent = s.num === state.step;
            const isPast = s.num < state.step;
            return (
              <React.Fragment key={s.num}>
                {i > 0 && (
                  <div className={`flex-1 h-px max-w-[60px] ${isPast || isCurrent ? "bg-primary/30" : "bg-foreground/[0.06]"}`} />
                )}
                <button
                  onClick={() => {
                    if (isPast) goToStep(s.num);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    isCurrent
                      ? "bg-primary/[0.08] text-primary font-medium"
                      : isPast
                        ? "text-foreground/50 hover:text-foreground/70 cursor-pointer"
                        : "text-foreground/20"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isCurrent
                      ? "bg-primary text-white"
                      : isPast
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-foreground/[0.06] text-foreground/25"
                  }`}>
                    {isPast ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      s.num
                    )}
                  </span>
                  {s.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto">
        {renderStep()}
      </main>
    </div>
  );
}
