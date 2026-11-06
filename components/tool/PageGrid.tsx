"use client";

import { useId } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { announce } from "@/components/ui/LiveRegion";
import { ThumbPaper } from "./ThumbPaper";

export type GridPage = { id: number; n: number; rotate: number };

/**
 * The pages of a document as thumbnails you reorder, turn and delete. Pick a page, then use the buttons: move it
 * earlier or later, rotate it a quarter turn, delete it. Nothing needs dragging, so it works with a keyboard and
 * a screen reader (each change is announced). The caller owns the list and the selected index.
 */
export function PageGrid({ pages, selected, onSelect, onMove, onRotate, onDelete, urls, request, legend = "Pages" }: {
  pages: GridPage[];
  selected: number | null;
  onSelect: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onRotate: (index: number) => void;
  onDelete: (index: number) => void;
  urls: Record<number, string>;
  request: (n: number) => void;
  legend?: string;
}) {
  const name = useId();
  const page = selected === null ? undefined : pages[selected];
  const index = selected ?? -1;

  return (
    <div className="grid gap-3">
      <div role="toolbar" aria-label={page ? `Page ${page.n} actions` : "Page actions"} className="flex flex-wrap items-center gap-0.5">
        <span className="mr-1.5 text-sm text-ink-2">{page ? `Page ${page.n}:` : "Select a page"}</span>
        <IconButton icon="arrow-left" label="Move earlier" disabled={!page || index <= 0}
          onClick={() => { onMove(index, -1); announce(`Page ${page!.n} moved to position ${index}`); }} />
        <IconButton icon="arrow-right" label="Move later" disabled={!page || index >= pages.length - 1}
          onClick={() => { onMove(index, 1); announce(`Page ${page!.n} moved to position ${index + 2}`); }} />
        <IconButton icon="rotate" label="Rotate" disabled={!page}
          onClick={() => { onRotate(index); announce(`Page ${page!.n} turned a quarter`); }} />
        <IconButton icon="trash" tone="danger" label="Delete page" disabled={!page || pages.length <= 1}
          onClick={() => { onDelete(index); announce(`Page ${page!.n} deleted`); }} />
      </div>

      <fieldset className="min-w-0">
        <legend className="sr-only">{legend}</legend>
        <ul className="pagegrid">
          {pages.map((p, i) => (
            <li key={p.id}>
              <label className="pg-item">
                <input type="radio" name={name} checked={selected === i} onChange={() => onSelect(i)} aria-label={`Page ${p.n}`} className="pg-input" />
                <span className="thumb">
                  <ThumbPaper n={p.n} url={urls[p.n]} request={request} rotate={p.rotate} />
                  <span className="mt-1.5 block text-sm font-medium">{i + 1}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <p className="hint">Select a page, then use the buttons. Nothing needs dragging.</p>
    </div>
  );
}
