"use client";

import { useEffect, useRef } from "react";
import { ACT_PATHS, PATH_TO_ACT } from "@/lib/constants";

export function useUrlSync(currentAct: number, goToAct: (act: number) => void) {
  const isInternalNav = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      const act = PATH_TO_ACT[window.location.pathname];
      if (act !== undefined && act !== currentAct) {
        isInternalNav.current = true;
        goToAct(act);
      }
    };
    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const targetPath = ACT_PATHS[currentAct];
    if (targetPath && window.location.pathname !== targetPath) {
      if (isInternalNav.current) { isInternalNav.current = false; return; }
      window.history.pushState(null, "", targetPath);
    }
  }, [currentAct]);
}
