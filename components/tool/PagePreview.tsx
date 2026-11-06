"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PdfDoc } from "@/lib/use-pdf-document";

const ZOOMS = [1, 1.5, 2, 3];
const LARGEST_FIT = 640;

/**
 * One page, drawn big, with a bar to turn pages and zoom. Anything passed as `children` is drawn over the page and
 * positioned with percentages (see PlacementOverlay), so it stays on the same spot at every size and zoom.
 * `toolbarStart` takes the editor's own buttons, such as undo and redo. The page is drawn on white paper.
 */
export function PagePreview({ doc, page, onPage, toolbarStart, children }: {
  doc: PdfDoc | null;
  page: number;
  onPage: (page: number) => void;
  toolbarStart?: ReactNode;
  children?: ReactNode;
}) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [fit, setFit] = useState(0);
  const [shape, setShape] = useState<{ doc: PdfDoc; page: number; width: number; height: number } | null>(null);
  const [drawn, setDrawn] = useState("");
  const [failed, setFailed] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // The width available, so the page fits it at zoom 1.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFit(Math.min(LARGEST_FIT, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The page's shape, so the frame is the right size before the picture arrives.
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(page).then((size) => { if (alive) setShape({ doc, page, ...size }); });
    return () => { alive = false; };
  }, [doc, page]);

  const width = Math.round(fit * ZOOMS[zoomIndex]);
  const key = doc ? `${doc.id}:${page}@${width}` : "";

  // Draw the page. A newer request cancels the older one, so a quick run of clicks never leaves a stale page.
  useEffect(() => {
    const el = canvas.current;
    if (!doc || !el || width <= 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      doc.render(page, el, width, { signal: controller.signal })
        .then(() => { if (!controller.signal.aborted) { setDrawn(key); setFailed(""); } })
        .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setFailed(key); });
    }, 60);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [doc, page, width, key]);

  const current = shape && doc && shape.doc === doc && shape.page === page ? shape : null;
  const ready = drawn === key && key !== "";
  const total = doc?.pageCount ?? 0;

  return (
    // min-w-0: inside a grid or flex parent the zoomed page must scroll in the stage, not stretch the column.
    <div className="min-w-0">
      <div ref={stage} className="pagestage">
        <div className="pagestage-paper" style={{ width: width || undefined, aspectRatio: current ? `${current.width} / ${current.height}` : "3 / 4" }}>
          <canvas ref={canvas} data-testid="page-canvas" data-rendered={ready ? "true" : "false"} aria-label={`Page ${page} of ${total}`} role="img" className="block h-full w-full" />
          {!ready && !failed && <Skeleton className="absolute inset-0 rounded-none" />}
          <div className="absolute inset-0">{children}</div>
        </div>
      </div>

      {failed === key && key !== "" && <Alert tone="error" className="mt-3">This page could not be drawn.</Alert>}

      <div className="pagestage-bar">
        <div className="pagestage-tools">{toolbarStart}</div>
        <div className="pagestage-nav">
          <IconButton icon="chevron-left" label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
          <span aria-live="polite">Page {page} of {total || "…"}</span>
          <IconButton icon="chevron-right" label="Next page" disabled={!total || page >= total} onClick={() => onPage(page + 1)} />
        </div>
        <div className="pagestage-tools">
          <IconButton icon="zoom-out" label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex(zoomIndex - 1)} />
          <span className="sr-only" aria-live="polite">Zoom {Math.round(ZOOMS[zoomIndex] * 100)}%</span>
          <IconButton icon="zoom-in" label="Zoom in" disabled={zoomIndex === ZOOMS.length - 1} onClick={() => setZoomIndex(zoomIndex + 1)} />
        </div>
      </div>
    </div>
  );
}
