"use client";

import { useCallback } from "react";
import { useDemoContext, useDemoDispatch } from "@/lib/demo-context";
import type { SecurityEvent } from "@/lib/types";

export function useDemoState() {
  const state = useDemoContext();
  const dispatch = useDemoDispatch();

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), [dispatch]);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), [dispatch]);
  const goToAct = useCallback((act: number) => dispatch({ type: "GO_TO_ACT", payload: act }), [dispatch]);
  const goToStep = useCallback((step: number) => dispatch({ type: "GO_TO_STEP", payload: step }), [dispatch]);
  const setScenario = useCallback((id: string) => dispatch({ type: "SET_SCENARIO", payload: id }), [dispatch]);
  const setConversation = useCallback((id: string) => dispatch({ type: "SET_CONVERSATION", payload: id }), [dispatch]);
  const toggleOverlay = useCallback(() => dispatch({ type: "TOGGLE_OVERLAY" }), [dispatch]);
  const setOverlayTab = useCallback((tab: "business" | "technical") => dispatch({ type: "SET_OVERLAY_TAB", payload: tab }), [dispatch]);
  const gateDecision = useCallback((gateId: string, decision: "approved" | "denied") => dispatch({ type: "GATE_DECISION", payload: { gateId, decision } }), [dispatch]);
  const addSecurityEvent = useCallback((event: SecurityEvent) => dispatch({ type: "ADD_SECURITY_EVENT", payload: event }), [dispatch]);
  const reset = useCallback(() => dispatch({ type: "RESET" }), [dispatch]);

  return {
    ...state,
    nextStep, prevStep, goToAct, goToStep,
    setScenario, setConversation, toggleOverlay, setOverlayTab,
    gateDecision, addSecurityEvent, reset,
  };
}
