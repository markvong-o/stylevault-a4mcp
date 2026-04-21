"use client";

import React from "react";
import { serverUrls } from "@/hooks/useServerPort";
import { useMCPPlaygroundState } from "@/hooks/useMCPPlaygroundState";
import { Step1Init } from "./steps/Step1Init";
import { Step2Tools } from "./steps/Step2Tools";
import { Step3CallTool } from "./steps/Step3CallTool";
import { Step4BoundedAuthority } from "./steps/Step4BoundedAuthority";
import { Step5Cleanup } from "./steps/Step5Cleanup";

const STEPS = [
  { num: 1, label: "Initialize" },
  { num: 2, label: "Tools" },
  { num: 3, label: "Call Tool" },
  { num: 4, label: "Authority" },
  { num: 5, label: "Cleanup" },
];

export function MCPPlaygroundView() {
  const {
    state, goToStep, selectTool, setToolArgs, reset,
    initializeSession, listTools, callTool,
    callBoundedAuthority, cleanupSession,
  } = useMCPPlaygroundState();

  const baseUrl = serverUrls().api;

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <Step1Init
            state={state}
            onInit={() => initializeSession(baseUrl)}
            onNext={() => goToStep(2)}
          />
        );
      case 2:
        return (
          <Step2Tools
            state={state}
            onFetchTools={() => {
              if (state.sessionId) listTools(baseUrl, state.sessionId);
            }}
            onSelectTool={(tool) => {
              selectTool(tool);
              goToStep(3);
            }}
            onBack={() => goToStep(1)}
          />
        );
      case 3:
        return (
          <Step3CallTool
            state={state}
            onArgsChange={setToolArgs}
            onExecute={() => {
              if (state.sessionId && state.selectedTool) {
                callTool(baseUrl, state.sessionId, state.selectedTool.name, state.toolArgs);
              }
            }}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        );
      case 4:
        return (
          <Step4BoundedAuthority
            state={state}
            onRun={() => {
              if (state.sessionId) callBoundedAuthority(baseUrl, state.sessionId);
            }}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        );
      case 5:
        return (
          <Step5Cleanup
            state={state}
            onCleanup={() => {
              if (state.sessionId) cleanupSession(baseUrl, state.sessionId);
            }}
            onReset={reset}
            onBack={() => goToStep(4)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-foreground/[0.06] px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-foreground/80">ChatGPT App Playground</h1>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <p className="text-xs text-foreground/35 mt-0.5">
              See the MCP protocol layer that powers ChatGPT Apps
            </p>
          </div>

          <button
            onClick={reset}
            className="text-xs text-foreground/35 hover:text-foreground/60 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-foreground/[0.03] border border-transparent hover:border-foreground/[0.08]"
          >
            Start Over
          </button>
        </div>
      </header>

      {/* Step indicator */}
      <div className="shrink-0 border-b border-foreground/[0.04] px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1">
          {STEPS.map((s, i) => {
            const isCurrent = s.num === state.step;
            const isPast = s.num < state.step;
            return (
              <React.Fragment key={s.num}>
                {i > 0 && (
                  <div className={`flex-1 h-px max-w-[60px] ${isPast || isCurrent ? "bg-primary/30" : "bg-foreground/[0.06]"}`} />
                )}
                <button
                  onClick={() => {
                    if (isPast) goToStep(s.num);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    isCurrent
                      ? "bg-primary/[0.08] text-primary font-medium"
                      : isPast
                        ? "text-foreground/50 hover:text-foreground/70 cursor-pointer"
                        : "text-foreground/20"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isCurrent
                      ? "bg-primary text-white"
                      : isPast
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-foreground/[0.06] text-foreground/25"
                  }`}>
                    {isPast ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      s.num
                    )}
                  </span>
                  {s.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto">
        {renderStep()}
      </main>
    </div>
  );
}
