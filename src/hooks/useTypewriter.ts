"use client";

import { useState, useEffect, useRef } from "react";

export function useTypewriter(text: string, speed: number = 30, trigger: boolean = true) {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!trigger) { setDisplayed(""); setIsDone(false); indexRef.current = 0; return; }
    setDisplayed(""); setIsDone(false); indexRef.current = 0;
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else { setIsDone(true); clearInterval(interval); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, trigger]);

  return { displayed, isDone };
}
