export const ACT_LABELS = [
  "Intro",
  "ChatGPT",
  "Gemini",
  "Closing",
];

export const TOTAL_ACTS = 4;

export const ACT_PATHS: Record<number, string> = {
  0: "/",
  1: "/demo/chatgpt",
  2: "/demo/gemini",
  3: "/demo/closing",
};

export const PATH_TO_ACT: Record<string, number> = Object.fromEntries(
  Object.entries(ACT_PATHS).map(([act, path]) => [path, Number(act)])
);

export const SECURITY_EVENT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  granted:  { bg: "rgba(34, 197, 94, 0.08)",  border: "rgba(34, 197, 94, 0.3)",  text: "#22c55e", glow: "glow-green" },
  approved: { bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b", glow: "glow-amber" },
  denied:   { bg: "rgba(239, 68, 68, 0.08)",  border: "rgba(239, 68, 68, 0.3)",  text: "#ef4444", glow: "glow-red" },
  pending:  { bg: "rgba(180, 155, 252, 0.08)", border: "rgba(180, 155, 252, 0.3)", text: "#B49BFC", glow: "" },
};
