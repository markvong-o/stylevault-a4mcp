"use client";

import { useEffect, useState } from "react";

const DEFAULT_PORT = 3001;
const MAX_PROBE = 10;

/**
 * Discovers the UCP/MCP server port by probing /health starting at 3001.
 * Returns the port once found, or null while probing.
 */
export function useServerPort() {
  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host =
      typeof window !== "undefined" ? window.location.hostname : "localhost";

    async function probe() {
      for (let p = DEFAULT_PORT; p < DEFAULT_PORT + MAX_PROBE; p++) {
        if (cancelled) return;
        try {
          const res = await fetch(`http://${host}:${p}/health`, {
            signal: AbortSignal.timeout(500),
          });
          if (res.ok) {
            if (!cancelled) setPort(p);
            return;
          }
        } catch {
          // port not responding, try next
        }
      }
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return port;
}

/** Build URLs from a discovered port. */
export function serverUrls(port: number) {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  return {
    ws: `ws://${host}:${port}/ws`,
    api: `http://${host}:${port}`,
    health: `http://${host}:${port}/health`,
    config: `http://${host}:${port}/api/config`,
  };
}
