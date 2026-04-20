"use client";

import React from "react";

interface StepIndicatorProps {
  currentAct: number;
  currentStep: number;
  totalSteps: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onNextAct: () => void;
  onPrevAct: () => void;
  isLastConversation?: boolean;
  isMultiChat?: boolean;
}

export function StepIndicator({
  currentAct, currentStep, totalSteps,
  onNextStep, onPrevStep, onNextAct, onPrevAct,
  isLastConversation = true, isMultiChat = false,
}: StepIndicatorProps) {
  if (currentAct === 0 || currentAct === 3) return null;

  const isLastStep = currentStep >= totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (!isLastStep) { onNextStep(); }
    else if (isMultiChat && !isLastConversation) { return; }
    else { onNextAct(); }
  };

  const handleBack = () => {
    if (!isFirstStep) { onPrevStep(); }
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
      {/* Floating pill */}
      <div className="flex items-center gap-1 rounded-full bg-[#1a1a2e]/90 backdrop-blur-xl border border-[#1a1a2e]/20 px-2 py-1.5 shadow-2xl shadow-black/15">
        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={isFirstStep}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Step counter */}
        {totalSteps > 0 && (
          <span className="text-[10px] text-white/30 font-mono px-2 border-l border-white/8">
            {currentStep + 1}/{totalSteps}
          </span>
        )}

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={isLastStep && isMultiChat && !isLastConversation}
          className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>{isLastStep && isMultiChat && !isLastConversation ? "Select" : isLastStep ? "Finish" : "Next"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Progress dots */}
      {totalSteps > 0 && totalSteps <= 20 && (
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-4 h-1 bg-primary/70"
                  : i < currentStep
                    ? "w-1 h-1 bg-foreground/20"
                    : "w-1 h-1 bg-foreground/8"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
