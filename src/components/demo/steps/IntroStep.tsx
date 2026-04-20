"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface IntroStepProps {
  onStart: () => void;
}

export function IntroStep({ onStart: _onStart }: IntroStepProps) {
  const router = useRouter();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-primary/[0.03] blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl px-8">
        {/* Logo + Title */}
        <div className={`transition-all duration-1000 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex items-center gap-5 mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4016A0] to-[#B49BFC] flex items-center justify-center shadow-xl shadow-primary/30">
              <span className="text-2xl font-bold text-white">SV</span>
            </div>
            <h1 className="text-6xl font-[family-name:var(--font-display)] italic bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent">
              StyleVault
            </h1>
          </div>
          <p className="text-base text-muted-foreground text-center mt-3 tracking-wide">
            Premium personal shopping, curated for you.
          </p>
        </div>

        {/* Main tagline */}
        <div className={`max-w-2xl text-center transition-all duration-1000 delay-200 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-2xl font-light text-foreground/70 leading-relaxed">
            &ldquo;What if your AI assistants could securely access your{" "}
            <span className="text-primary font-medium">StyleVault</span> account?&rdquo;
          </p>
        </div>

        {/* Supporting copy */}
        <div className={`max-w-xl text-center transition-all duration-1000 delay-300 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            By securing its agentic endpoints with Auth0, StyleVault shipped two integration paths in parallel: a ChatGPT App powered by MCP, ready for OpenAI&apos;s Agentic Commerce Protocol (ACP) and Instant Checkout, and a Google/Gemini integration via the Universal Commerce Protocol (UCP). One security layer across both protocols, cutting time to market while keeping operational costs low.
          </p>
          <p className="text-base text-foreground/50 mt-5">
            From identity to consent to spending limits,{" "}
            <span className="text-primary font-semibold">Auth0 secures every interaction.</span>
          </p>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-1000 delay-500 ${phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 group relative px-8 py-3 rounded-full text-base font-medium text-white bg-gradient-to-r from-primary to-primary/80 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          >
            <span className="relative z-10">Explore Demos &rarr;</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
