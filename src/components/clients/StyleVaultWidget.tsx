"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { DemoStep, ChatMessage, SecurityEvent } from "@/lib/types";
import { STYLEVAULT_AI_STEPS, CONSENT_DENIED_STEPS_A, CIBA_DENIAL_STEPS_A, computeEffectiveSteps } from "@/lib/scenario";
import { ChatSimulator } from "./ChatSimulator";
import { Button } from "@/components/ui/button";

interface StyleVaultWidgetProps {
  onAddSecurityEvent: (event: SecurityEvent) => void;
}

export function StyleVaultWidget({ onAddSecurityEvent }: StyleVaultWidgetProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [gateDecisions, setGateDecisions] = useState<Record<string, "approved" | "denied">>({});
  const [cibaApproved, setCibaApproved] = useState<Record<string, boolean>>({});
  const addedEventsRef = useRef<Set<string>>(new Set());
  const [userTyping, setUserTyping] = useState({ typing: false, text: "", done: false });
  const handleUserTyping = useCallback((state: { typing: boolean; text: string; done: boolean }) => {
    setUserTyping(state);
  }, []);

  const effectiveSteps = useMemo(
    () => computeEffectiveSteps(STYLEVAULT_AI_STEPS, gateDecisions, CIBA_DENIAL_STEPS_A, CONSENT_DENIED_STEPS_A),
    [gateDecisions],
  );

  const currentStepData = effectiveSteps[step];
  const isLastStep = step >= effectiveSteps.length - 1;

  // Collect security events
  useEffect(() => {
    if (!currentStepData?.securityEvent) return;
    const evtId = currentStepData.securityEvent.id;
    if (!addedEventsRef.current.has(evtId)) {
      addedEventsRef.current.add(evtId);
      onAddSecurityEvent(currentStepData.securityEvent);
    }
  }, [step, currentStepData, onAddSecurityEvent]);

  // Chat messages
  const { chatMessages, visibleCount } = useMemo(() => {
    const msgs: ChatMessage[] = [];
    for (let i = 0; i <= step && i < effectiveSteps.length; i++) {
      if (effectiveSteps[i].chat) msgs.push(effectiveSteps[i].chat!);
    }
    return { chatMessages: msgs, visibleCount: msgs.length };
  }, [effectiveSteps, step]);

  // Gate checks
  const isConsentGate = currentStepData?.gate === "consent" && currentStepData.securityMoment?.kind === "consent";
  const isCibaGate = currentStepData?.gate === "ciba" && currentStepData.securityMoment?.kind === "ciba";

  const handleGateDecision = useCallback((gateId: string, decision: "approved" | "denied") => {
    setGateDecisions(prev => ({ ...prev, [gateId]: decision }));
  }, []);

  const handleConsentApprove = () => {
    if (currentStepData?.gateId) { handleGateDecision(currentStepData.gateId, "approved"); setStep(s => s + 1); }
  };
  const handleConsentDeny = () => {
    if (currentStepData?.gateId) { handleGateDecision(currentStepData.gateId, "denied"); setStep(s => s + 1); }
  };
  const handleCibaApprove = () => {
    if (currentStepData?.gateId) {
      setCibaApproved(prev => ({ ...prev, [currentStepData.gateId!]: true }));
      handleGateDecision(currentStepData.gateId, "approved");
      setTimeout(() => setStep(s => s + 1), 1000);
    }
  };
  const handleCibaDeny = () => {
    if (currentStepData?.gateId) { handleGateDecision(currentStepData.gateId, "denied"); setStep(s => s + 1); }
  };

  const handleNext = () => { if (!isLastStep) setStep(s => s + 1); };
  const handlePrev = () => { if (step > 0) setStep(s => s - 1); };

  // Floating bubble when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#4016A0] to-[#B49BFC] shadow-lg shadow-[#4016A0]/30 flex items-center justify-center text-white hover:scale-105 transition-transform cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-30 w-[648px] h-[580px] rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden animate-slide-up scrollbar-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-[#4016A0]/5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4016A0] to-[#B49BFC] flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">SV</span>
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-[#191919]">StyleVault AI</span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">1st-Party</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-black/5 text-black/40 cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <ChatSimulator
          messages={chatMessages}
          visibleCount={visibleCount}
          theme="dark"
          clientName="StyleVault AI"
          typing={currentStepData?.chat?.role === "assistant" && step < effectiveSteps.length - 1 ? false : undefined}
          onUserTyping={handleUserTyping}
        />

        {/* Consent overlay (inside widget) */}
        {isConsentGate && currentStepData.securityMoment?.kind === "consent" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-white/60">
            <div className="w-[340px] rounded-xl border border-[#4016A0]/20 bg-white shadow-lg p-5 animate-slide-up">
              <div className="text-center mb-3">
                <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#4016A0]/10 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4016A0" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <p className="text-sm font-semibold"><span className="font-bold">{currentStepData.securityMoment.clientName}</span> wants to access your <span className="font-bold">{currentStepData.securityMoment.productName}</span> account</p>
              </div>
              <ul className="space-y-2 mb-4">
                {currentStepData.securityMoment.scopes.map(s => (
                  <li key={s.scope} className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded bg-[#4016A0]/10 flex items-center justify-center text-[#4016A0]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/></svg>
                    </div>
                    <span>{s.label}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleConsentDeny} className="flex-1">Deny</Button>
                <Button size="sm" onClick={handleConsentApprove} className="flex-1">Approve</Button>
              </div>
            </div>
          </div>
        )}

        {/* CIBA overlay (inside widget) */}
        {isCibaGate && currentStepData.securityMoment?.kind === "ciba" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-white/60">
            <div className={`w-[340px] rounded-xl border bg-white shadow-lg p-5 animate-slide-up ${
              currentStepData.gateId && cibaApproved[currentStepData.gateId] ? "border-emerald-300 glow-green" : "border-amber-300 glow-amber"
            }`}>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4016A0" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span className="text-xs font-semibold">Auth0 Guardian</span>
              </div>
              <p className="text-sm font-medium mb-1">{currentStepData.securityMoment.action}</p>
              <p className="text-xs text-black/50 mb-4">{currentStepData.securityMoment.description}</p>
              {currentStepData.gateId && cibaApproved[currentStepData.gateId] ? (
                <p className="text-sm text-emerald-600 text-center">&#10003; Approved by {currentStepData.securityMoment.approverName}</p>
              ) : (
                <div className="flex gap-2">
                  <Button variant="deny" size="sm" onClick={handleCibaDeny} className="flex-1">Deny</Button>
                  <Button variant="approve" size="sm" onClick={handleCibaApprove} className="flex-1">Approve</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-2 rounded-xl bg-black/[0.03] px-3 py-2.5 border">
          <span className={`flex-1 text-sm ${userTyping.typing ? "text-[#191919]" : "text-black/40"}`}>
            {userTyping.typing ? userTyping.text : "Message StyleVault AI..."}
            {userTyping.typing && <span className="animate-pulse">|</span>}
          </span>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            userTyping.done ? "bg-[#4016A0] text-white scale-90" : userTyping.typing ? "bg-[#4016A0] text-white" : "bg-black/5 text-black/30"
          }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" /></svg>
          </div>
        </div>
      </div>

      {/* Step navigation */}
      <div className="px-3 py-2 border-t flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={handlePrev} disabled={step === 0}>&larr;</Button>
        <div className="flex-1">
          <div className="h-1 bg-black/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#4016A0]/50 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / effectiveSteps.length) * 100}%` }} />
          </div>
          <p className="text-[10px] text-black/30 text-center mt-0.5">Step {step + 1} of {effectiveSteps.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleNext} disabled={isLastStep || isConsentGate || isCibaGate}>&rarr;</Button>
      </div>
    </div>
  );
}
