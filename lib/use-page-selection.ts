"use client";

import { useMemo, useState } from "react";
import { formatRanges, parseRanges } from "./ranges";

const NONE: ReadonlySet<number> = new Set();

/**
 * Which pages are chosen, from thumbnails and from typed ranges ("2, 5-7"), kept in step with each other. With
 * `defaultAll` nothing needs choosing: until the person picks, every page counts, and clearing the text goes back to that.
 * `onChange` runs on any change, so a tool can clear an old result.
 */
export function usePageSelection(pageCount: number, defaultAll: boolean, onChange?: () => void) {
  const [picked, setPicked] = useState<Set<number> | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | undefined>();
  const everything = useMemo(() => new Set(Array.from({ length: pageCount }, (_, i) => i + 1)), [pageCount]);

  const selected: ReadonlySet<number> = picked ?? (defaultAll ? everything : NONE);
  const rangeText = typed ?? (picked ? formatRanges(picked) : "");

  const apply = (next: Set<number>) => {
    onChange?.();
    setPicked(next);
    setTyped(null);
    setRangeError(undefined);
  };

  return {
    selected,
    rangeText,
    rangeError,
    toggle: (n: number) => {
      const next = new Set(selected);
      if (next.has(n)) next.delete(n); else next.add(n);
      apply(next);
    },
    selectAll: () => apply(new Set(everything)),
    clear: () => apply(new Set()),
    invert: () => apply(new Set([...everything].filter((n) => !selected.has(n)))),
    onRange: (text: string) => {
      onChange?.();
      setTyped(text);
      if (defaultAll && text.trim() === "") { setPicked(null); setRangeError(undefined); return; }
      const parsed = parseRanges(text, pageCount);
      if (parsed.error) { setRangeError(parsed.error); return; }
      setRangeError(undefined);
      setPicked(new Set(parsed.pages));
    },
  };
}
