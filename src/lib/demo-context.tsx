"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from "react";
import type { DemoState, DemoAction, SecurityEvent } from "./types";

const initialState: DemoState = {
  currentAct: 0,
  currentStep: 0,
  overlayOpen: false,
  overlayTab: "business",
  activeScenario: "",
  activeConversation: "",
  conversationSteps: {},
  gateDecisions: {},
  securityEvents: [],
};

function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "NEXT_STEP":
      return { ...state, currentStep: state.currentStep + 1 };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case "GO_TO_ACT":
      return { ...state, currentAct: action.payload, currentStep: 0 };
    case "GO_TO_STEP":
      return { ...state, currentStep: action.payload };
    case "SET_SCENARIO":
      return { ...state, activeScenario: action.payload, currentStep: 0, activeConversation: "", conversationSteps: {} };
    case "SET_CONVERSATION":
      return { ...state, activeConversation: action.payload, currentStep: 0 };
    case "TOGGLE_OVERLAY":
      return { ...state, overlayOpen: !state.overlayOpen };
    case "SET_OVERLAY_TAB":
      return { ...state, overlayTab: action.payload };
    case "GATE_DECISION":
      return { ...state, gateDecisions: { ...state.gateDecisions, [action.payload.gateId]: action.payload.decision } };
    case "ADD_SECURITY_EVENT":
      return { ...state, securityEvents: [...state.securityEvents, action.payload] };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const DemoContext = createContext<DemoState>(initialState);
const DemoDispatchContext = createContext<Dispatch<DemoAction>>(() => {});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, initialState);
  return (
    <DemoContext.Provider value={state}>
      <DemoDispatchContext.Provider value={dispatch}>{children}</DemoDispatchContext.Provider>
    </DemoContext.Provider>
  );
}

export function useDemoContext() { return useContext(DemoContext); }
export function useDemoDispatch() { return useContext(DemoDispatchContext); }
