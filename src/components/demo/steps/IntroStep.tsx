"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface IntroStepProps {
  onStart: () => void;
}

export function IntroStep({ onStart }: IntroStepProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
      <div className={`transition-all duration-700 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4016A0] to-[#B49BFC] flex items-center justify-center shadow-lg shadow-[#4016A0]/20">
            <span className="text-2xl font-bold text-white">SV</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
            StyleVault
          </h1>
        </div>
        <p className="text-lg text-muted-foreground text-center mt-2">
          Premium personal shopping, curated for you.
        </p>
      </div>

      <div className={`max-w-2xl text-center transition-all duration-700 delay-200 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <p className="text-2xl font-light text-foreground/80 leading-relaxed">
          &ldquo;What if your AI assistants could securely access your{" "}
          <span className="text-[#4016A0] font-medium">StyleVault</span> account?&rdquo;
        </p>
      </div>

      <div className={`max-w-xl text-center transition-all duration-700 delay-300 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          By securing both MCP and Universal Commerce Protocol endpoints with Auth0, StyleVault became a serious contender in the new agentic era of commerce, accelerating time to market while reducing operational costs.
        </p>
        <p className="text-base text-foreground/60 mt-4">
          Every connection. Every action. Every limit.<br />
          <span className="text-primary font-semibold">Secured by Auth0.</span>
        </p>
      </div>

      <div className={`transition-all duration-700 delay-500 ${phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <Button size="lg" onClick={onStart} className="mt-4 text-base px-8">
          Start Demo &rarr;
        </Button>
      </div>
    </div>
  );
}
