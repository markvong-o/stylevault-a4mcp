"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

interface IntroStepProps {
  onStart: () => void;
}

export function IntroStep({ onStart: _onStart }: IntroStepProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
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
        <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-5 mb-3">
            <Store className="h-12 w-12 text-[#B49BFC]" />
            <h1 className="text-6xl font-bold">
              <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent">Retail</span><span className="text-[#B49BFC]">Zero</span>
            </h1>
          </div>
          <p className="text-base text-muted-foreground text-center mt-3 tracking-wide">
            Premium personal shopping, curated for you.
          </p>
        </div>

        {/* Main tagline */}
        <div className={`max-w-2xl text-center transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-2xl font-light text-foreground/70 leading-relaxed">
            &ldquo;What if your AI assistants could securely access your{" "}
            <span className="text-primary font-medium">RetailZero</span> account?&rdquo;
          </p>
        </div>

        {/* Supporting copy */}
        <div className={`max-w-xl text-center transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            By securing its agentic endpoints with Auth0, RetailZero shipped two integration paths in parallel: a ChatGPT App powered by MCP, ready for OpenAI&apos;s Agentic Commerce Protocol (ACP) and Instant Checkout, and a Google/Gemini integration via the Universal Commerce Protocol (UCP). One security layer across both protocols, cutting time to market while keeping operational costs low.
          </p>
          <p className="text-base text-foreground/50 mt-5">
            From identity to consent to spending limits,{" "}
            <span className="text-primary font-semibold">Auth0 secures every interaction.</span>
          </p>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
