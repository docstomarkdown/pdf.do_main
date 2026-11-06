"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

type Tone = "danger" | "primary";

function Thumb({ n, url, selected, tone, onToggle, request }: {
  n: number; url?: string; selected: boolean; tone: Tone; onToggle: (n: number) => void; request: (n: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { request(n); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [n, request]);

  const ring = tone === "danger" ? "ring-red-600 bg-red-50" : "ring-indigo-600 bg-indigo-50";
  const badge = tone === "danger" ? "bg-red-600" : "bg-indigo-600";
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Page ${n}`}
      onClick={() => onToggle(n)}
      className={`group relative block w-full rounded-xl p-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${selected ? `ring-2 ${ring}` : "ring-1 ring-slate-200 hover:ring-slate-400"}`}
    >
      <span className="relative block aspect-[3/4] overflow-hidden rounded-md bg-slate-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" draggable={false} className={`h-full w-full object-contain ${selected && tone === "danger" ? "opacity-60" : ""}`} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Loading…</span>
        )}
        {selected && (
          <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white ${badge}`}>
            <Icon name={tone === "danger" ? "close" : "check"} className="h-4 w-4" />
          </span>
        )}
      </span>
      <span className="mt-1.5 block text-sm font-medium text-slate-800">{n}</span>
    </button>
  );
}

/** A grid of page thumbnails you click to select. Presentational: the caller owns selection and rendering. */
export function PagePicker({ pageCount, urls, request, selected, onToggle, tone }: {
  pageCount: number;
  urls: Record<number, string>;
  request: (n: number) => void;
  selected: Set<number>;
  onToggle: (n: number) => void;
  tone: Tone;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <li key={n}>
          <Thumb n={n} url={urls[n]} selected={selected.has(n)} tone={tone} onToggle={onToggle} request={request} />
        </li>
      ))}
    </ul>
  );
}
