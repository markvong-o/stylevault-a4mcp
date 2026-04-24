"use client";

import React, { useState, useEffect, useRef } from "react";

interface UniversalLoginScreenProps {
  onLogin: () => void;
  visible: boolean;
}

export function UniversalLoginScreen({ onLogin, visible }: UniversalLoginScreenProps) {
  const [phase, setPhase] = useState<"idle" | "authenticating" | "success">("idle");
  const [emailTyped, setEmailTyped] = useState("");
  const emailDone = useRef(false);
  const email = "alex@example.com";

  useEffect(() => {
    if (!visible || emailDone.current) return;
    let i = 0;
    const speed = 55;
    const interval = setInterval(() => {
      i++;
      setEmailTyped(email.slice(0, i));
      if (i >= email.length) {
        clearInterval(interval);
        emailDone.current = true;
      }
    }, speed);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const handlePasskeyClick = () => {
    setPhase("authenticating");
    setTimeout(() => {
      setPhase("success");
      setTimeout(() => onLogin(), 800);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-sm animate-in">
      {/* Security checkpoint label */}
      <div className="mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-primary/70">Security Checkpoint</span>
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-primary/20 animate-slide-up overflow-hidden event-card-active">
        {/* Header band */}
        <div className="bg-[#F6F1E7] px-8 pt-8 pb-6 text-center border-b border-black/6">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4016A0] to-[#B49BFC] flex items-center justify-center shadow-lg shadow-[#4016A0]/30">
              <span className="text-sm font-bold text-white">SV</span>
            </div>
            <span className="text-lg font-semibold text-[#191919]">RetailZero</span>
          </div>
          <h2 className="text-xl font-semibold text-[#191919]">Sign in to RetailZero</h2>
          <p className="text-sm text-[#191919]/50 mt-1">to continue to ChatGPT</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {phase === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-600">Authenticated as Alex Morgan</p>
            </div>
          ) : phase === "authenticating" ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse">
                {/* Fingerprint icon */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4016A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                  <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6a6 6 0 0 1 4.8 2.4" />
                  <path d="M10 12c0-1.1.9-2 2-2s2 .9 2 2c0 4-1.5 7-3.5 9" />
                  <path d="M14 12c0 3-1 5.5-2.5 7.5" />
                  <path d="M18 12c0 1.5-.2 3-.6 4.3" />
                  <path d="M22 12c0 1-.1 2-.3 3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Verifying passkey...</p>
                <p className="text-xs text-muted-foreground mt-1">Touch your fingerprint sensor</p>
              </div>
            </div>
          ) : (
            <>
              {/* Email field (pre-filled) */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email address</label>
                <div className="w-full px-3 py-2.5 rounded-lg border border-black/10 bg-black/[0.03] text-sm text-foreground">
                  {emailTyped}{emailTyped.length < email.length && <span className="animate-pulse">|</span>}
                </div>
              </div>

              {/* Passkey button */}
              <button
                onClick={handlePasskeyClick}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-lg shadow-primary/20"
              >
                {/* Passkey / key icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
                  <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
                Continue with Passkey
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-black/8" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="flex-1 h-px bg-black/8" />
              </div>

              {/* Alternative methods (decorative) */}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-black/10 text-sm text-muted-foreground hover:bg-black/[0.03] transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Continue with SMS
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-5 pt-2 flex items-center justify-center gap-1.5 border-t">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/25"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span className="text-[10px] text-foreground/25 font-medium">Secured by Auth0</span>
        </div>
      </div>
    </div>
  );
}
