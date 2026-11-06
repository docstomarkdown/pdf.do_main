"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PdfDoc } from "./use-pdf-document";

/**
 * Page thumbnails on demand. Call `request(n)` when a thumbnail scrolls into view; pages are drawn one at a time so
 * a long document never floods the main thread. Every object URL is revoked, and nothing is kept, when the document
 * changes or the component unmounts.
 */
export function useThumbs(doc: PdfDoc | null, thumbWidth = 240): { urls: Record<number, string>; request: (n: number) => void } {
  const [state, setState] = useState<{ doc: PdfDoc | null; urls: Record<number, string> }>({ doc: null, urls: {} });
  const api = useRef<{ request: (n: number) => void } | null>(null);
  // Pages asked for before the document was ready. A thumbnail asks only once, so these are kept and drawn on arrival.
  const early = useRef(new Set<number>());

  useEffect(() => {
    if (!doc) return;
    let disposed = false;
    let running = false;
    const queue: number[] = [];
    const queued = new Set<number>();
    const made: string[] = [];

    async function pump() {
      if (running || !doc) return;
      running = true;
      const canvas = document.createElement("canvas");
      while (queue.length && !disposed) {
        const n = queue.shift()!;
        try {
          await doc.render(n, canvas, thumbWidth, { dpr: 1 });
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
          if (blob && !disposed) {
            const url = URL.createObjectURL(blob);
            made.push(url);
            setState((s) => ({ doc, urls: { ...(s.doc === doc ? s.urls : {}), [n]: url } }));
          }
        } catch {
          /* leave this thumbnail blank; the page can still be selected */
        }
      }
      canvas.width = 0;
      running = false;
    }

    api.current = {
      request(n) {
        if (queued.has(n)) return;
        queued.add(n);
        queue.push(n);
        void pump();
      },
    };

    early.current.forEach((n) => api.current!.request(n));
    early.current.clear();

    return () => {
      disposed = true;
      api.current = null;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [doc, thumbWidth]);

  const request = useCallback((n: number) => {
    if (api.current) api.current.request(n);
    else early.current.add(n);
  }, []);
  return { urls: doc && state.doc === doc ? state.urls : {}, request };
}
