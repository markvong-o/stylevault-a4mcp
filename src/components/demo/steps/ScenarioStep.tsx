"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import type { ScenarioConfig, DemoStep, ChatMessage, SecurityEvent } from "@/lib/types";
import { ClientBShell } from "@/components/clients/ClientBShell";
import { ClientGeminiShell } from "@/components/clients/ClientGeminiShell";
import { GEMINI_CONVERSATIONS, GEMINI_MCP_CONVERSATIONS } from "@/lib/scenario";
import { ConsentScreen } from "@/components/security/ConsentScreen";
import { CIBANotification } from "@/components/security/CIBANotification";
import { UniversalLoginScreen } from "@/components/security/UniversalLoginScreen";
import { UcpDiscoveryScreen } from "@/components/security/UcpDiscoveryScreen";
import { Badge } from "@/components/ui/badge";
import { GuideBubble } from "@/components/demo/GuideBubble";
import { AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDemoLiveCalls } from "@/hooks/useDemoLiveCalls";

interface ScenarioStepProps {
  config: ScenarioConfig;
  steps: DemoStep[];
  currentStep: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onGateDecision: (gateId: string, decision: "approved" | "denied") => void;
  onSyncSecurityEvents: (events: SecurityEvent[]) => void;
  onComplete: () => void;
  activeConversation?: string;
  onConversationClick?: (id: string) => void;
  isLastConversation?: boolean;
  isMultiChat?: boolean;
}

export function ScenarioStep({
  config, steps, currentStep,
  onNextStep, onPrevStep,
  onGateDecision, onSyncSecurityEvents, onComplete,
  activeConversation, onConversationClick,
  isLastConversation = true, isMultiChat = false,
}: ScenarioStepProps) {
  const prevEventsRef = useRef<string[]>([]);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealedStep, setRevealedStep] = useState(-1);
  const [cibaApproved, setCibaApproved] = useState<Record<string, boolean>>({});

  useDemoLiveCalls(config.id, steps, currentStep);

  const currentStepData = steps[currentStep];

  // Collect chat messages -filter by active conversation if steps use conversations
  const { chatMessages, visibleCount } = useMemo(() => {
    const hasConversations = steps.some(s => s.conversation);
    const msgs: ChatMessage[] = [];
    const visibleSteps = steps.slice(0, currentStep + 1);

    if (hasConversations && activeConversation) {
      // Only show messages from the active conversation thread
      for (const step of visibleSteps) {
        if (step.conversation === activeConversation && step.chat) {
          msgs.push(step.chat);
        }
      }
    } else {
      // Default: show all messages linearly
      for (const step of visibleSteps) {
        if (step.chat) {
          msgs.push(step.chat);
        }
      }
    }
    return { chatMessages: msgs, visibleCount: msgs.length };
  }, [steps, currentStep, activeConversation]);

  // Delay revealing current step's event until after animations finish
  useEffect(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

    const step = steps[currentStep];
    if (!step?.securityEvent) {
      // No event on this step -- reveal immediately
      setRevealedStep(currentStep);
      return;
    }

    if (step.gate) {
      // Gate steps (consent/CIBA/login/UCP discovery): don't reveal event yet.
      // It'll be revealed when the user acts and moves to the next step.
      // For now, only mark past steps as revealed.
      setRevealedStep(currentStep - 1);
      return;
    }

    if (step.chat?.role === "assistant") {
      // Assistant response: delay by thinking (1.5s) + streaming (~content.length * 18ms) + buffer
      const thinkingMs = 1500;
      const streamingMs = (step.chat.content?.length ?? 100) * 18;
      const delay = thinkingMs + streamingMs + 300;
      pendingTimerRef.current = setTimeout(() => {
        setRevealedStep(currentStep);
      }, delay);
      // Show previous steps' events immediately
      setRevealedStep(currentStep - 1);
      return;
    }

    // Other steps (system messages, etc.): reveal immediately
    setRevealedStep(currentStep);
  }, [currentStep, steps]);

  // Sync security events based on revealed step
  useEffect(() => {
    const upTo = Math.min(revealedStep + 1, steps.length);
    const visibleSteps = steps.slice(0, upTo);
    const currentEventIds = visibleSteps
      .filter(s => s.securityEvent)
      .map(s => s.securityEvent!.id);

    const prevIds = prevEventsRef.current;
    const isSame = currentEventIds.length === prevIds.length &&
      currentEventIds.every((id, i) => id === prevIds[i]);

    if (!isSame) {
      prevEventsRef.current = currentEventIds;
      const events = visibleSteps
        .filter(s => s.securityEvent)
        .map(s => s.securityEvent!);
      onSyncSecurityEvents(events);
    }
  }, [revealedStep, steps, onSyncSecurityEvents]);

  // Derive all revealed security events for the guide rail
  const revealedEvents = useMemo(() => {
    const upTo = Math.min(revealedStep + 1, steps.length);
    return steps.slice(0, upTo)
      .filter(s => s.securityEvent)
      .map(s => s.securityEvent!);
  }, [revealedStep, steps]);

  // Auto-scroll guide rail to bottom when new events appear
  const guideBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (guideBottomRef.current && revealedEvents.length > 0) {
      guideBottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [revealedEvents.length]);

  // Gate handling
  const isConsentGate = currentStepData?.gate === "consent" && currentStepData.securityMoment?.kind === "consent";
  const isCibaGate = currentStepData?.gate === "ciba" && currentStepData.securityMoment?.kind === "ciba";
  const isLoginGate = currentStepData?.gate === "login" && currentStepData.securityMoment?.kind === "login";
  const isUcpDiscoveryGate = currentStepData?.gate === "ucp-discovery" && currentStepData.securityMoment?.kind === "ucp-discovery";

  const handleConsentApprove = () => {
    if (currentStepData?.gateId) {
      onGateDecision(currentStepData.gateId, "approved");
      onNextStep();
    }
  };

  const handleConsentDeny = () => {
    if (currentStepData?.gateId) {
      onGateDecision(currentStepData.gateId, "denied");
      onNextStep();
    }
  };

  const handleCibaApprove = () => {
    if (currentStepData?.gateId) {
      setCibaApproved((prev) => ({ ...prev, [currentStepData.gateId!]: true }));
      onGateDecision(currentStepData.gateId, "approved");
      setTimeout(() => onNextStep(), 1000);
    }
  };

  const handleCibaDeny = () => {
    if (currentStepData?.gateId) {
      onGateDecision(currentStepData.gateId, "denied");
      onNextStep();
    }
  };

  const handleLogin = () => {
    if (currentStepData?.gateId) {
      onGateDecision(currentStepData.gateId, "approved");
      onNextStep();
    }
  };

  const handleUcpDiscoveryAuthorize = () => {
    if (currentStepData?.gateId) {
      onGateDecision(currentStepData.gateId, "approved");
      onNextStep();
    }
  };

  const handleUcpDiscoveryDeny = () => {
    if (currentStepData?.gateId) {
      onGateDecision(currentStepData.gateId, "denied");
      onNextStep();
    }
  };

  // Inline step navigation
  const totalSteps = steps.length;
  const isLastStep = currentStep >= totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleStepNext = () => {
    if (!isLastStep) onNextStep();
    else if (isMultiChat && !isLastConversation) return;
    else onComplete();
  };

  const handleStepBack = () => {
    if (!isFirstStep) onPrevStep();
  };

  const stepNav = totalSteps > 0 ? (
    <div className="flex items-center gap-1 rounded-full bg-[#1a1a2e]/90 backdrop-blur-xl border border-[#1a1a2e]/20 px-1.5 py-1 shadow-lg">
      <button
        onClick={handleStepBack}
        disabled={isFirstStep}
        className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="text-[9px] text-white/30 font-mono px-1.5 border-l border-white/8">
        {currentStep + 1}/{totalSteps}
      </span>
      <button
        onClick={handleStepNext}
        disabled={isLastStep && isMultiChat && !isLastConversation}
        className="h-6 px-2 rounded-full flex items-center gap-1 text-[10px] font-medium bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
      >
        <span>{isLastStep && isMultiChat && !isLastConversation ? "Select" : isLastStep ? "Finish" : "Next"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  ) : null;

  // Render the appropriate client shell
  const renderClientShell = () => {
    if (config.clientTheme === "enterprise") {
      const isUCPoverMCP = config.id === "scenario-d";
      return (
        <ClientGeminiShell
          messages={chatMessages}
          visibleCount={visibleCount}
          activeConversation={activeConversation}
          onConversationClick={onConversationClick}
          conversations={isUCPoverMCP ? GEMINI_MCP_CONVERSATIONS : GEMINI_CONVERSATIONS}
          transportLabel={isUCPoverMCP ? "UCP-over-MCP" : undefined}
          stepNav={stepNav}
        />
      );
    }
    return <ClientBShell messages={chatMessages} visibleCount={visibleCount} activeConversation={activeConversation} onConversationClick={onConversationClick} stepNav={stepNav} />;
  };

  const CLIENT_TYPE_BADGES: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    "1st-party": { label: "1st-Party", variant: "success" },
    "3rd-party": { label: "3rd-Party", variant: "warning" },
    "3rd-party-read": { label: "3rd-Party Read", variant: "warning" },
    "3rd-party-constrained": { label: "3rd-Party Constrained", variant: "default" },
  };

  const badge = CLIENT_TYPE_BADGES[config.clientType] ?? { label: config.clientType, variant: "default" as const };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-6 gap-4 overflow-hidden">
      {/* Scenario header */}
      <div className="flex items-center gap-3 shrink-0">
        <h2 className="text-xl font-semibold text-foreground">{config.clientName}</h2>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="text-sm text-muted-foreground">{config.description}</span>
      </div>

      {/* Client shell + guide rail */}
      <div className="flex-1 min-h-0 flex gap-0">
        {/* Chat window */}
        <div className="flex-1 min-w-0 relative">
          {renderClientShell()}
        </div>

        {/* Guide rail */}
        <div className="w-[430px] shrink-0 flex flex-col border-l">
          <div className="px-3 py-2.5 border-b flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-xs font-semibold tracking-wide uppercase text-foreground/40">What&apos;s Happening</span>
          </div>
          <ScrollArea className="flex-1 px-2 py-2">
            {revealedEvents.length === 0 ? (
              <p className="text-[11px] text-foreground/20 text-center py-8 px-2">
                Security events will appear here as the demo progresses.
              </p>
            ) : (
              <div className="relative space-y-2">
                {/* Timeline vertical line */}
                <div className="absolute left-[4px] top-3 bottom-3 w-px bg-black/[0.08]" />
                <AnimatePresence initial={false}>
                  {revealedEvents.map((evt, i) => (
                    <GuideBubble
                      key={evt.id}
                      event={evt}
                      isLatest={i === revealedEvents.length - 1}
                    />
                  ))}
                </AnimatePresence>
                <div ref={guideBottomRef} />
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Consent overlay */}
      {isConsentGate && currentStepData.securityMoment?.kind === "consent" && (
        <ConsentScreen
          clientName={currentStepData.securityMoment.clientName}
          productName={currentStepData.securityMoment.productName}
          scopes={currentStepData.securityMoment.scopes}
          onApprove={handleConsentApprove}
          onDeny={handleConsentDeny}
          visible={true}
        />
      )}

      {/* CIBA notification */}
      {isCibaGate && currentStepData.securityMoment?.kind === "ciba" && (
        <CIBANotification
          action={currentStepData.securityMoment.action}
          description={currentStepData.securityMoment.description}
          approverName={currentStepData.securityMoment.approverName}
          onApprove={handleCibaApprove}
          onDeny={handleCibaDeny}
          visible={true}
          approved={currentStepData.gateId ? cibaApproved[currentStepData.gateId] : false}
        />
      )}

      {/* Universal Login */}
      {isLoginGate && (
        <UniversalLoginScreen
          onLogin={handleLogin}
          visible={true}
        />
      )}

      {/* UCP Discovery */}
      {isUcpDiscoveryGate && currentStepData.securityMoment?.kind === "ucp-discovery" && (
        <UcpDiscoveryScreen
          merchantName={currentStepData.securityMoment.merchantName}
          capabilities={currentStepData.securityMoment.capabilities}
          manifestUrl={currentStepData.securityMoment.manifestUrl}
          onAuthorize={handleUcpDiscoveryAuthorize}
          onDeny={handleUcpDiscoveryDeny}
          visible={true}
        />
      )}
    </div>
  );
}
