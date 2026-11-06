"use client";

import { Icon } from "@/components/ui/Icon";
import { ThumbPaper } from "./ThumbPaper";

type Tone = "danger" | "primary";

function Thumb({ n, url, selected, tone, onToggle, request, rotate }: {
  n: number; url?: string; selected: boolean; tone: Tone; onToggle: (n: number) => void; request: (n: number) => void; rotate?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Page ${n}`}
      onClick={() => onToggle(n)}
      className={`thumb ${tone === "danger" ? "thumb-danger" : ""}`.trim()}
    >
      <ThumbPaper n={n} url={url} request={request} rotate={rotate} imgClassName={selected && tone === "danger" ? "opacity-60" : ""}>
        {selected && (
          <span className="thumb-badge">
            <Icon name={tone === "danger" ? "close" : "check"} className="h-4 w-4" />
          </span>
        )}
      </ThumbPaper>
      <span className="mt-1.5 block text-sm font-medium">{n}</span>
    </button>
  );
}

/** A grid of page thumbnails you click to select. Presentational: the caller owns selection and rendering. */
export function PagePicker({ pageCount, urls, request, selected, onToggle, tone, rotations }: {
  pageCount: number;
  urls: Record<number, string>;
  request: (n: number) => void;
  selected: Set<number>;
  onToggle: (n: number) => void;
  tone: Tone;
  /** Degrees each page is shown turned (a tool that rotates pages previews it here). */
  rotations?: Record<number, number>;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <li key={n}>
          <Thumb n={n} url={urls[n]} selected={selected.has(n)} tone={tone} onToggle={onToggle} request={request} rotate={rotations?.[n]} />
        </li>
      ))}
    </ul>
  );
}
