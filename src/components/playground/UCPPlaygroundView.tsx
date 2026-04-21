"use client";

import React from "react";
import { serverUrls } from "@/hooks/useServerPort";
import { usePlaygroundState } from "@/hooks/usePlaygroundState";
import { Step1Manifest } from "./steps/Step1Manifest";
import { Step2Catalog } from "./steps/Step2Catalog";
import { Step3Checkout } from "./steps/Step3Checkout";
import { Step4Escalation } from "./steps/Step4Escalation";
import { Step5Complete } from "./steps/Step5Complete";

const STEPS = [
  { num: 1, label: "Discover" },
  { num: 2, label: "Catalog" },
  { num: 3, label: "Checkout" },
  { num: 4, label: "Approval" },
  { num: 5, label: "Complete" },
];

export function UCPPlaygroundView() {
  const {
    state, goToStep, setSearchQuery, selectProduct, setQuantity,
    reset, fetchManifest, searchCatalog, createCheckout,
    simulateEscalation, completeCheckout,
  } = usePlaygroundState();

  const baseUrl = serverUrls().api;

  // Determine visible steps (hide step 4 if no escalation needed and checkout exists)
  const visibleSteps = state.checkoutSession && !state.needsEscalation
    ? STEPS.filter(s => s.num !== 4)
    : STEPS;

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <Step1Manifest
            state={state}
            onFetch={() => fetchManifest(baseUrl)}
            onNext={() => goToStep(2)}
          />
        );
      case 2:
        return (
          <Step2Catalog
            state={state}
            onSearch={(q) => searchCatalog(baseUrl, q)}
            onSearchQueryChange={setSearchQuery}
            onSelectProduct={selectProduct}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        );
      case 3:
        return (
          <Step3Checkout
            state={state}
            onQuantityChange={setQuantity}
            onCreate={() => {
              if (state.selectedProduct) {
                createCheckout(baseUrl, state.selectedProduct.id, state.quantity);
              }
            }}
            onNext={() => goToStep(state.needsEscalation ? 4 : 5)}
            onBack={() => goToStep(2)}
          />
        );
      case 4:
        return (
          <Step4Escalation
            state={state}
            onSimulateApproval={() => {
              if (state.checkoutSession) {
                simulateEscalation(state.checkoutSession.session_id);
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
            onComplete={() => {
              if (state.checkoutSession) {
                completeCheckout(baseUrl, state.checkoutSession.session_id, state.escalationToken);
              }
            }}
            onReset={reset}
            onBack={() => goToStep(state.needsEscalation ? 4 : 3)}
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
              <h1 className="text-lg font-semibold text-foreground/80">Commerce Playground</h1>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                LIVE
              </span>
            </div>
            <p className="text-xs text-foreground/35 mt-0.5">
              Step through a real UCP commerce flow with live API calls
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
          {visibleSteps.map((s, i) => {
            const isCurrent = s.num === state.step;
            const isPast = s.num < state.step || (s.num === 4 && state.step === 5 && !state.needsEscalation);
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
