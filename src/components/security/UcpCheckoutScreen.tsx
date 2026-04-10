"use client";

import React from "react";

interface UcpCheckoutScreenProps {
  currentState: "incomplete" | "requires_escalation" | "ready_for_complete" | "complete_in_progress" | "completed" | "canceled";
  stateDescription: string;
  continueUrl?: string;
  onProceed: () => void;
  visible: boolean;
}

const STATES = [
  { id: "incomplete", label: "Incomplete" },
  { id: "requires_escalation", label: "Requires Escalation" },
  { id: "ready_for_complete", label: "Ready to Complete" },
  { id: "completed", label: "Completed" },
] as const;

export function UcpCheckoutScreen({ currentState, stateDescription, continueUrl, onProceed, visible }: UcpCheckoutScreenProps) {
  if (!visible) return null;

  const activeIdx = STATES.findIndex(s => s.id === currentState);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in">
      <div className="w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">UCP Checkout Session</h3>
              <p className="text-sm text-gray-500">Universal Commerce Protocol state machine</p>
            </div>
          </div>
        </div>

        {/* State machine visualization */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            {STATES.map((state, i) => {
              const isActive = state.id === currentState;
              const isPast = i < activeIdx;
              return (
                <React.Fragment key={state.id}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? "bg-amber-500 text-white ring-4 ring-amber-500/20"
                        : isPast
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-400"
                    }`}>
                      {isPast ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight max-w-[72px] ${
                      isActive ? "text-amber-600" : isPast ? "text-emerald-600" : "text-gray-400"
                    }`}>
                      {state.label}
                    </span>
                  </div>
                  {i < STATES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mt-[-18px] ${
                      isPast ? "bg-emerald-500" : "bg-gray-200"
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* State description */}
          <div className={`rounded-lg border p-4 mb-4 ${
            currentState === "requires_escalation"
              ? "bg-amber-50 border-amber-200"
              : currentState === "completed"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-gray-50 border-gray-200"
          }`}>
            <p className="text-sm text-gray-700">{stateDescription}</p>
            {continueUrl && (
              <p className="text-xs text-gray-500 mt-2 font-mono">continue_url: {continueUrl}</p>
            )}
          </div>

          {currentState === "requires_escalation" && (
            <p className="text-xs text-gray-500 mb-4">
              The checkout session requires buyer approval. Auth0 CIBA will send a push notification for step-up authentication.
            </p>
          )}
        </div>

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            onClick={onProceed}
            className="w-full py-2.5 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors cursor-pointer"
          >
            {currentState === "requires_escalation" ? "Proceed to Buyer Approval" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
