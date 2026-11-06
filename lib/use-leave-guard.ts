"use client";

import { useEffect } from "react";

/**
 * While `active` is true (a job is running), the browser asks before the page is closed or reloaded, because
 * the work and its result live only in this tab. Nothing is stored; leaving simply stops the job.
 */
export function useLeaveGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const ask = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [active]);
}
