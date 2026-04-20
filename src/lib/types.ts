// === Demo Navigation ===
export interface DemoState {
  currentAct: number;        // 0=intro, 1-3=scenarios, 4=closing (5 total acts)
  currentStep: number;       // step within current act
  overlayOpen: boolean;
  activeScenario: string;    // scenario ID
  activeConversation: string; // active conversation ID (for multi-chat scenarios like ChatGPT)
  conversationSteps: Record<string, number>; // per-conversation step tracking
  gateDecisions: Record<string, "approved" | "denied">;
  securityEvents: SecurityEvent[];
}

export type DemoAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_ACT"; payload: number }
  | { type: "GO_TO_STEP"; payload: number }
  | { type: "SET_SCENARIO"; payload: string }
  | { type: "SET_CONVERSATION"; payload: string }
  | { type: "TOGGLE_OVERLAY" }
  | { type: "GATE_DECISION"; payload: { gateId: string; decision: "approved" | "denied" } }
  | { type: "ADD_SECURITY_EVENT"; payload: SecurityEvent }
  | { type: "SYNC_SECURITY_EVENTS"; payload: SecurityEvent[] }
  | { type: "RESET" };

// === Scenario & Steps ===
export interface DemoStep {
  id: string;
  type: "chat" | "security-moment" | "system";
  chat?: ChatMessage;
  securityMoment?: SecurityMomentType;
  gate?: "ciba" | "consent" | "login" | "ucp-discovery" | "ucp-checkout";
  gateId?: string;
  securityEvent?: SecurityEvent;
  conversation?: string; // Groups steps into separate chat threads (used by ChatGPT scenario)
}

export type SecurityMomentType =
  | { kind: "consent"; clientName: string; productName: string; scopes: ScopeDescription[]; onApprove: string; onDeny: string }
  | { kind: "ciba"; action: string; description: string; approverName: string }
  | { kind: "denial"; reason: string; aiExplanation: string }
  | { kind: "bounded-authority"; limit: string; requested: string; aiExplanation: string }
  | { kind: "login"; method: "passkey" | "sms" }
  | { kind: "ucp-discovery"; merchantName: string; capabilities: string[]; manifestUrl: string }
  | { kind: "ucp-checkout"; checkoutState: "incomplete" | "requires_escalation" | "ready_for_complete" | "complete_in_progress" | "completed" | "canceled"; stateDescription: string; continueUrl?: string };

export interface ScopeDescription {
  scope: string;
  label: string;
  icon: string;
}

export interface ScenarioConfig {
  id: string;
  label: string;
  clientName: string;
  clientType: "1st-party" | "3rd-party" | "3rd-party-read" | "3rd-party-constrained";
  clientTheme: "dark" | "chatgpt" | "enterprise";
  description: string;
  scopes: string[];
  steps: DemoStep[];
  cibaDenialSteps: Record<string, DemoStep>;
  consentDeniedSteps: DemoStep[];
}

// === Chat Messages ===
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCall?: {
    name: string;
    status: "success" | "denied" | "pending";
    detail?: string;
    steps?: {
      label: string;
      description: string;
      status: "success" | "denied" | "pending";
      request?: string;
      response?: string;
    }[];
  };
}

// === Security Events (for overlay) ===
export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: "consent" | "ciba" | "scope-denial" | "bounded-authority" | "token-issued" | "fga-check" | "tool-call" | "ucp-discovery" | "ucp-checkout-state" | "ucp-payment-auth" | "mcp-discovery" | "mcp-dcr";
  result: "granted" | "denied" | "pending" | "approved";
  scenarioId: string;
  shortDescription: string;
  businessDescription: string;
  technicalDetail: TechnicalDetail;
}

export interface TechnicalDetail {
  protocol: string;
  request?: string;
  response?: string;
  tokenClaims?: Record<string, unknown>;
  idTokenClaims?: Record<string, unknown>;
  fgaTuple?: { user: string; relation: string; object: string; allowed: boolean };
  toolName?: string;
  tokenExchange?: {
    request: string;
    response: string;
  };
  downstreamApi?: {
    request: string;
    response: string;
  };
}

// === Mock JWT Token ===
export interface MockToken {
  scenarioId: string;
  label: string;
  header: { alg: string; typ: string; kid: string };
  payload: {
    iss: string;
    sub: string;
    aud: string;
    iat: number;
    exp: number;
    scope: string;
    act?: { sub: string };
    [key: string]: unknown;
  };
  color: string;
}
