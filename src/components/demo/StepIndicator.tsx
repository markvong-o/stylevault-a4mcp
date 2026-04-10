"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface StepIndicatorProps {
  currentAct: number;
  currentStep: number;
  totalSteps: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onNextAct: () => void;
  onPrevAct: () => void;
  onGoToAct: (act: number) => void;
  isLastConversation?: boolean;
  isMultiChat?: boolean;
}

export function StepIndicator({
  currentAct, currentStep, totalSteps,
  onNextStep, onPrevStep, onNextAct, onPrevAct, onGoToAct,
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
    <div className="w-full bg-white px-6 py-3 shrink-0">
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        {/* Scenario toggle + step controls */}
        <div className="flex items-center gap-4">
          <div className="w-20 shrink-0">
            {!isFirstStep && (
              <Button onClick={handleBack} variant="ghost" size="sm">&larr; Back</Button>
            )}
          </div>

          {/* Scenario toggle (center) */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center bg-black/[0.03] rounded-lg p-0.5">
              <button
                onClick={() => onGoToAct(1)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  currentAct === 1
                    ? "bg-white shadow-sm text-foreground"
                    : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentAct === 1 ? "bg-[#10a37f]" : "bg-foreground/20"}`} />
                ChatGPT
                <span className={`text-[9px] px-1 py-px rounded ${currentAct === 1 ? "bg-[#10a37f]/10 text-[#10a37f]" : "bg-black/[0.04] text-foreground/30"}`}>MCP</span>
              </button>
              <button
                onClick={() => onGoToAct(2)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  currentAct === 2
                    ? "bg-white shadow-sm text-foreground"
                    : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentAct === 2 ? "bg-[#4285f4]" : "bg-foreground/20"}`} />
                Gemini
                <span className={`text-[9px] px-1 py-px rounded ${currentAct === 2 ? "bg-[#4285f4]/10 text-[#4285f4]" : "bg-black/[0.04] text-foreground/30"}`}>UCP</span>
              </button>
            </div>
          </div>

          <div className="w-20 shrink-0 flex justify-end">
            <Button onClick={handleNext} variant="secondary" size="sm" className="whitespace-nowrap" disabled={isLastStep && isMultiChat && !isLastConversation}>
              {isLastStep && isMultiChat && !isLastConversation ? "Select \u2190" : isLastStep ? "Finish \u2192" : "Next \u2192"}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div>
            <div className="h-1 bg-black/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/50 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 text-center">
              Step {currentStep + 1} of {totalSteps}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
