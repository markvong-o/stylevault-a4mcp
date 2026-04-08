"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import type { ScenarioConfig, DemoStep, ChatMessage, SecurityEvent } from "@/lib/types";
import { ClientBShell } from "@/components/clients/ClientBShell";
import { ConsentScreen } from "@/components/security/ConsentScreen";
import { CIBANotification } from "@/components/security/CIBANotification";
import { UniversalLoginScreen } from "@/components/security/UniversalLoginScreen";
import { Badge } from "@/components/ui/badge";

interface ScenarioStepProps {
  config: ScenarioConfig;
  steps: DemoStep[];
  currentStep: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onGateDecision: (gateId: string, decision: "approved" | "denied") => void;
  onAddSecurityEvent: (event: SecurityEvent) => void;
  onComplete: () => void;
  activeConversation?: string;
  onConversationClick?: (id: string) => void;
}

export function ScenarioStep({
  config, steps, currentStep,
  onNextStep, onPrevStep,
  onGateDecision, onAddSecurityEvent, onComplete,
  activeConversation, onConversationClick,
}: ScenarioStepProps) {
  const addedEventsRef = useRef<Set<string>>(new Set());
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

  // Add security events as steps are revealed
  useEffect(() => {
    if (!currentStepData?.securityEvent) return;
    const evtId = currentStepData.securityEvent.id;
    if (!addedEventsRef.current.has(evtId)) {
      addedEventsRef.current.add(evtId);
      onAddSecurityEvent(currentStepData.securityEvent);
    }
  }, [currentStep, currentStepData, onAddSecurityEvent]);

  // Gate handling
  const isConsentGate = currentStepData?.gate === "consent" && currentStepData.securityMoment?.kind === "consent";
  const isCibaGate = currentStepData?.gate === "ciba" && currentStepData.securityMoment?.kind === "ciba";
  const isLoginGate = currentStepData?.gate === "login" && currentStepData.securityMoment?.kind === "login";

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

  // Render the appropriate client shell
  const renderClientShell = () => {
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
    </div>
  );
}
