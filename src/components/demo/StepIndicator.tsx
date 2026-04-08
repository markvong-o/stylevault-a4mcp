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
  onNextStep, onPrevStep, onNextAct, onPrevAct,
  isLastConversation = true, isMultiChat = false,
}: StepIndicatorProps) {
  if (currentAct === 0 || currentAct === 2) return null;

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
    <div className="w-full border-t bg-white/80 backdrop-blur-md px-6 py-3 shrink-0">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="w-20 shrink-0">
          {!isFirstStep && (
            <Button onClick={handleBack} variant="ghost" size="sm">&larr; Back</Button>
          )}
        </div>

        <div className="flex-1">
          {totalSteps > 0 && (
            <div>
              <div className="h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1 text-center">
                Step {currentStep + 1} of {totalSteps}
              </div>
            </div>
          )}
        </div>

        <div className="w-32 shrink-0 flex justify-end">
          <Button onClick={handleNext} variant="secondary" size="sm" className="whitespace-nowrap" disabled={isLastStep && isMultiChat && !isLastConversation}>
            {isLastStep && isMultiChat && !isLastConversation ? "Select a chat \u2190" : isLastStep ? "Finish \u2192" : "Continue \u2192"}
          </Button>
        </div>
      </div>
    </div>
  );
}
