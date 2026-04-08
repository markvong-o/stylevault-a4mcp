"use client";

import React, { useCallback, useMemo } from "react";
import { useDemoState } from "@/hooks/useDemoState";
import { useUrlSync } from "@/hooks/useUrlSync";
import { SCENARIO_CONFIGS, getConversationSteps, computeEffectiveSteps, CHATGPT_CONVERSATIONS } from "@/lib/scenario";
import { StepIndicator } from "./StepIndicator";
import { SecurityOverlay } from "./SecurityOverlay";
import { IntroStep } from "./steps/IntroStep";
import { ScenarioStep } from "./steps/ScenarioStep";
import { ClosingStep } from "./steps/ClosingStep";
import { StyleVaultWidget } from "@/components/clients/StyleVaultWidget";

export function DemoContent() {
  const {
    currentAct, currentStep, overlayOpen, overlayTab,
    activeConversation, gateDecisions, securityEvents,
    nextStep, prevStep, goToAct,
    setConversation, toggleOverlay, setOverlayTab,
    gateDecision, addSecurityEvent, reset,
  } = useDemoState();

  // Auto-set first conversation when entering ChatGPT act
  const handleGoToAct = useCallback((act: number) => {
    goToAct(act);
    if (act === 1 && CHATGPT_CONVERSATIONS.length > 0) {
      setConversation(CHATGPT_CONVERSATIONS[0].id);
    }
  }, [goToAct, setConversation]);

  useUrlSync(currentAct, handleGoToAct);

  const handleReset = useCallback(() => {
    reset();
    window.history.pushState(null, "", "/");
  }, [reset]);

  const handleNextAct = useCallback(() => {
    if (currentAct >= 2) { handleReset(); return; }
    handleGoToAct(currentAct + 1);
  }, [currentAct, handleGoToAct, handleReset]);

  const handlePrevAct = useCallback(() => {
    if (currentAct > 0) handleGoToAct(currentAct - 1);
  }, [currentAct, handleGoToAct]);

  const handleConversationClick = useCallback((id: string) => {
    setConversation(id);
  }, [setConversation]);

  const chatgptConfig = SCENARIO_CONFIGS[0]; // Only config is ChatGPT

  const allEffectiveSteps = useMemo(() => {
    if (currentAct !== 1) return [];
    return computeEffectiveSteps(
      chatgptConfig.steps,
      gateDecisions,
      chatgptConfig.cibaDenialSteps,
      chatgptConfig.consentDeniedSteps,
    );
  }, [currentAct, gateDecisions, chatgptConfig]);

  const effectiveSteps = useMemo(() => {
    if (!activeConversation) return allEffectiveSteps;
    return getConversationSteps(allEffectiveSteps, activeConversation);
  }, [activeConversation, allEffectiveSteps]);

  const renderAct = () => {
    switch (currentAct) {
      case 0:
        return <IntroStep onStart={handleNextAct} />;
      case 1:
        return (
          <ScenarioStep
            config={chatgptConfig}
            steps={effectiveSteps}
            currentStep={currentStep}
            onNextStep={nextStep}
            onPrevStep={prevStep}
            onGateDecision={gateDecision}
            onAddSecurityEvent={addSecurityEvent}
            onComplete={handleNextAct}
            activeConversation={activeConversation || undefined}
            onConversationClick={handleConversationClick}
          />
        );
      case 2:
        return <ClosingStep securityEvents={securityEvents} onRestart={handleReset} />;
      default:
        return <IntroStep onStart={handleNextAct} />;
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-all duration-300 ${overlayOpen ? "mr-[520px]" : ""}`}>
      {/* Header */}
      <div className="w-full px-6 py-3 flex items-center justify-between border-b shrink-0">
        <button onClick={handleReset} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <span className="text-xl font-semibold text-foreground">StyleVault</span>
        </button>
        <div className="flex items-center gap-3">
          {currentAct > 0 && (
            <button
              onClick={toggleOverlay}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border hover:border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground/70 hover:text-foreground cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              {overlayOpen ? "Hide" : "Show"} Under the Hood
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {renderAct()}
      </main>

      {/* Step navigation */}
      <StepIndicator
        currentAct={currentAct}
        currentStep={currentStep}
        totalSteps={effectiveSteps.length}
        onNextStep={nextStep}
        onPrevStep={prevStep}
        onNextAct={handleNextAct}
        onPrevAct={handlePrevAct}
        onGoToAct={handleGoToAct}
        isMultiChat={currentAct === 1}
        isLastConversation={currentAct !== 1 || activeConversation === CHATGPT_CONVERSATIONS[CHATGPT_CONVERSATIONS.length - 1]?.id}
      />

      {/* StyleVault AI floating widget -visible during ChatGPT scenario */}
      {currentAct === 1 && (
        <StyleVaultWidget onAddSecurityEvent={addSecurityEvent} />
      )}

      {/* Disclaimer */}
      <div className="w-full border-t px-6 py-2 text-center shrink-0">
        <p className="text-xs text-muted-foreground italic">This is a fictitious application created for demonstration purposes only. All data, identities, and scenarios are simulated.</p>
      </div>

      {/* Security overlay */}
      <SecurityOverlay
        open={overlayOpen}
        tab={overlayTab}
        events={securityEvents}
        onToggle={toggleOverlay}
        onSetTab={setOverlayTab}
      />
    </div>
  );
}
