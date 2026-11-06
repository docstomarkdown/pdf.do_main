"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A page thumbnail. It asks for its picture only when it scrolls into view, so a long document draws what is on
 * screen first. Pages sit on white paper whatever the theme. `rotate` turns the picture in 90 degree steps.
 */
export function ThumbPaper({ n, url, request, rotate = 0, imgClassName = "", children }: {
  n: number; url?: string; request: (n: number) => void; rotate?: number; imgClassName?: string; children?: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { request(n); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [n, request]);

  // A page turned a quarter way is wider than tall, so it is scaled down to stay inside its frame.
  const turned = rotate % 180 !== 0;
  return (
    <span ref={ref} className="thumb-paper">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          draggable={false}
          className={`h-full w-full object-contain transition-transform ${imgClassName}`.trim()}
          style={rotate ? { transform: `rotate(${rotate}deg)${turned ? " scale(0.75)" : ""}` } : undefined}
        />
      ) : (
        <span className="thumb-wait absolute inset-0 flex items-center justify-center text-xs">Loading…</span>
      )}
      {children}
    </span>
  );
}
