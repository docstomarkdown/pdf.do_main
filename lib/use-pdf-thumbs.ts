"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

type State = { pageCount: number; urls: Record<number, string>; error?: string };

/**
 * Renders page thumbnails on demand with pdf.js. Call request(n) when a thumbnail scrolls into view;
 * pages render one at a time so a long document never floods the main thread. All object URLs are
 * revoked and the document is destroyed when the file changes or the component unmounts.
 */
export function usePdfThumbs(file: File | null, thumbWidth = 240) {
  const [state, setState] = useState<State>({ pageCount: 0, urls: {} });
  const api = useRef<{ request: (n: number) => void } | null>(null);

  useEffect(() => {
    if (!file) return;
    let disposed = false;
    let running = false;
    let task: PDFDocumentLoadingTask | null = null;
    let doc: PDFDocumentProxy | null = null;
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
          const page = await doc.getPage(n);
          const natural = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: thumbWidth / natural.width });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport, background: "#ffffff" }).promise;
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.78));
          page.cleanup();
          if (blob && !disposed) {
            const url = URL.createObjectURL(blob);
            made.push(url);
            setState((s) => ({ ...s, urls: { ...s.urls, [n]: url } }));
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

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/engines/vendor/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        doc = await task.promise;
        if (disposed) return;
        setState({ pageCount: doc.numPages, urls: {} });
        void pump();
      } catch (e) {
        if (disposed) return;
        const message = e instanceof Error && /password/i.test(e.message)
          ? "This PDF is password-protected. Password support is not built yet."
          : "This file could not be read as a PDF.";
        setState({ pageCount: 0, urls: {}, error: message });
      }
    })();

    return () => {
      disposed = true;
      api.current = null;
      made.forEach((u) => URL.revokeObjectURL(u));
      void task?.destroy();
    };
  }, [file, thumbWidth]);

  const request = useCallback((n: number) => api.current?.request(n), []);
  // A new file resets what we show, without a setState call in the effect.
  return file ? { ...state, request } : { pageCount: 0, urls: {} as Record<number, string>, error: undefined, request };
}
