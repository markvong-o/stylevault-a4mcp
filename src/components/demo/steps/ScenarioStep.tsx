"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import type { ScenarioConfig, DemoStep, ChatMessage, SecurityEvent } from "@/lib/types";
import { ClientBShell } from "@/components/clients/ClientBShell";
import { ClientGeminiShell } from "@/components/clients/ClientGeminiShell";
import { ConsentScreen } from "@/components/security/ConsentScreen";
import { CIBANotification } from "@/components/security/CIBANotification";
import { UniversalLoginScreen } from "@/components/security/UniversalLoginScreen";
import { UcpDiscoveryScreen } from "@/components/security/UcpDiscoveryScreen";
import { Badge } from "@/components/ui/badge";

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
}

export function ScenarioStep({
  config, steps, currentStep,
  onNextStep, onPrevStep,
  onGateDecision, onSyncSecurityEvents, onComplete,
  activeConversation, onConversationClick,
}: ScenarioStepProps) {
  const prevEventsRef = useRef<string[]>([]);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealedStep, setRevealedStep] = useState(-1);
  const [cibaApproved, setCibaApproved] = useState<Record<string, boolean>>({});

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

  // Render the appropriate client shell
  const renderClientShell = () => {
    if (config.clientTheme === "enterprise") {
      return <ClientGeminiShell messages={chatMessages} visibleCount={visibleCount} activeConversation={activeConversation} onConversationClick={onConversationClick} />;
    }
    return <ClientBShell messages={chatMessages} visibleCount={visibleCount} activeConversation={activeConversation} onConversationClick={onConversationClick} />;
  };

  const CLIENT_TYPE_BADGES: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    "1st-party": { label: "1st-Party", variant: "success" },
    "3rd-party": { label: "3rd-Party", variant: "warning" },
    "3rd-party-read": { label: "3rd-Party Read", variant: "warning" },
    "3rd-party-constrained": { label: "3rd-Party Constrained", variant: "default" },
  };

  const badge = CLIENT_TYPE_BADGES[config.clientType] ?? { label: config.clientType, variant: "default" as const };

  return (
    <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
      {/* Scenario header */}
      <div className="flex items-center gap-3 shrink-0">
        <h2 className="text-xl font-semibold text-foreground">{config.clientName}</h2>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="text-sm text-muted-foreground">{config.description}</span>
      </div>

      {/* Client shell -fixed height container */}
      <div className="h-[600px] shrink-0">
        {renderClientShell()}
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
