import type { ChatMessage } from "../types";

export function makeScopeDenialMessage(toolName: string, explanation: string): ChatMessage {
  return {
    id: `denial-${toolName}`,
    role: "assistant",
    content: explanation,
    timestamp: new Date().toISOString(),
    toolCall: { name: toolName, status: "denied", detail: "insufficient_scope" },
  };
}

export function makeBoundedAuthorityMessage(limit: string, requested: string, explanation: string): ChatMessage {
  return {
    id: `bounded-${requested}`,
    role: "assistant",
    content: explanation,
    timestamp: new Date().toISOString(),
    toolCall: { name: "place_order", status: "denied", detail: `bounded_authority_exceeded: ${limit}` },
  };
}
