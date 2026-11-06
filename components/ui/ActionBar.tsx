"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Holds the one primary action. On a narrow container it is a bar stuck to the bottom edge, so the action stays in
 * reach; on a wide one it sits inline (see .actionbar in app/globals.css). While it is stuck it tells the notifier how
 * tall it is, so toasts rise above it instead of covering the action.
 */
export function ActionBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      if (getComputedStyle(el).position === "sticky") root.style.setProperty("--toast-bottom-offset", `${el.offsetHeight + 12}px`);
      else root.style.removeProperty("--toast-bottom-offset");
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--toast-bottom-offset");
    };
  }, []);

  return <div ref={ref} className={`actionbar ${className}`.trim()}>{children}</div>;
}
