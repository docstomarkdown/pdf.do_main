"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

/**
 * One opened PDF, shared by everything that draws it: the thumbnails and the page preview use the same document,
 * so a big file is read and held once. (iOS Safari kills tabs under memory pressure, so copies matter.)
 */
export type PdfDoc = {
  /** A number that is different for every opened document, to key work by. */
  id: number;
  pageCount: number;
  /** A page's size in PDF points, for its shape. */
  pageSize: (n: number) => Promise<{ width: number; height: number }>;
  /**
   * Draws page `n` into `canvas` so it is `widthPx` CSS pixels wide (sharper on a dense screen, at most 2x).
   * Rejects with an AbortError when `signal` aborts. Pages are drawn on white paper, whatever the theme.
   */
  render: (n: number, canvas: HTMLCanvasElement, widthPx: number, opts?: { signal?: AbortSignal; dpr?: number }) => Promise<void>;
  /** The text stored on page `n`, as lines in reading order. Empty for a page that is only a picture (a scan). */
  text: (n: number) => Promise<string>;
  /** The pictures drawn on page `n`, as PNG files. Pictures narrower or shorter than `minPx` (icons, rules) are left out. */
  images: (n: number, minPx: number) => Promise<{ width: number; height: number; blob: Blob }[]>;
  /** The lines of text on page `n` with their text size and distance from the page bottom, top line first. Empty for a picture-only page. */
  lines: (n: number) => Promise<{ text: string; size: number; y: number }[]>;
  /** The top-level bookmarks (the outline), each with the page it points to. Empty when the file has none. */
  outline: () => Promise<{ title: string; page: number }[]>;
};

type RawImage = { width: number; height: number; kind?: number; data?: Uint8Array | Uint8ClampedArray; bitmap?: ImageBitmap };

/** pdf.js hands over a picture as pixels in one of three layouts (1 bit grey, RGB, RGBA) or as a bitmap. */
function drawRaw(raw: RawImage): HTMLCanvasElement | null {
  const { width, height } = raw;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (raw.bitmap) { ctx.drawImage(raw.bitmap, 0, 0); return canvas; }
  const data = raw.data;
  if (!data) return null;
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (raw.kind === 3) rgba.set(data.subarray(0, rgba.length));
  else if (raw.kind === 2) for (let i = 0, j = 0; i < width * height; i++) { rgba[j++] = data[i * 3]; rgba[j++] = data[i * 3 + 1]; rgba[j++] = data[i * 3 + 2]; rgba[j++] = 255; }
  else if (raw.kind === 1) {
    const row = (width + 7) >> 3;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const v = (data[y * row + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
      const o = (y * width + x) * 4;
      rgba[o] = rgba[o + 1] = rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  } else return null;
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

type State = { doc: PdfDoc | null; error?: string };

let serial = 0;

function wrap(pdf: PDFDocumentProxy): PdfDoc {
  const sizes = new Map<number, Promise<{ width: number; height: number }>>();
  return {
    id: ++serial,
    pageCount: pdf.numPages,
    pageSize(n) {
      let size = sizes.get(n);
      if (!size) {
        size = pdf.getPage(n).then((page) => {
          const view = page.getViewport({ scale: 1 });
          page.cleanup();
          return { width: view.width, height: view.height };
        });
        sizes.set(n, size);
      }
      return size;
    },
    async text(n) {
      const page = await pdf.getPage(n);
      try {
        const content = await page.getTextContent();
        let out = "";
        let lastY: number | null = null;
        let lineEnded = true;
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = item.transform[5];
          // A new line when the text drops by more than half its height, unless the previous item already ended one.
          if (lastY !== null && !lineEnded && Math.abs(y - lastY) > Math.max(2, item.height * 0.5)) out += "\n";
          out += item.str;
          lineEnded = item.hasEOL;
          if (item.hasEOL) out += "\n";
          lastY = y;
        }
        return out.replace(/[ \t]+\n/g, "\n").trim();
      } finally {
        page.cleanup();
      }
    },
    async lines(n) {
      const page = await pdf.getPage(n);
      try {
        const content = await page.getTextContent();
        const rows: { text: string; size: number; y: number; chars: number }[] = [];
        for (const item of content.items) {
          if (!("str" in item) || item.str === "") continue;
          const y = item.transform[5];
          const last = rows[rows.length - 1];
          if (last && Math.abs(y - last.y) <= Math.max(2, item.height * 0.5)) {
            last.text += item.str;
            if (item.str.length > last.chars) { last.size = item.height; last.chars = item.str.length; }
          } else rows.push({ text: item.str, size: item.height, y, chars: item.str.length });
        }
        return rows.map(({ text, size, y }) => ({ text: text.trim(), size, y })).filter((r) => r.text !== "");
      } finally {
        page.cleanup();
      }
    },
    async outline() {
      const items = await pdf.getOutline();
      if (!items) return [];
      const found: { title: string; page: number }[] = [];
      for (const item of items) {
        let dest = item.dest;
        if (typeof dest === "string") dest = await pdf.getDestination(dest);
        if (!Array.isArray(dest) || dest[0] === undefined || dest[0] === null) continue;
        const index = typeof dest[0] === "object" ? await pdf.getPageIndex(dest[0]) : Number(dest[0]);
        if (Number.isInteger(index) && index >= 0 && index < pdf.numPages) found.push({ title: item.title.trim() || "Untitled", page: index + 1 });
      }
      return found;
    },
    async images(n, minPx) {
      const { OPS } = await import("pdfjs-dist");
      const page = await pdf.getPage(n);
      try {
        const list = await page.getOperatorList();
        const found: { width: number; height: number; blob: Blob }[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < list.fnArray.length; i++) {
          if (list.fnArray[i] !== OPS.paintImageXObject && list.fnArray[i] !== OPS.paintImageXObjectRepeat) continue;
          const id = list.argsArray[i][0] as string;
          if (seen.has(id)) continue;
          seen.add(id);
          const raw = await new Promise<RawImage | null>((resolve) => { page.objs.get(id, resolve, () => resolve(null)); });
          if (!raw || raw.width < minPx || raw.height < minPx) continue;
          const canvas = drawRaw(raw);
          if (!canvas) continue;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          canvas.width = 0;
          if (blob) found.push({ width: raw.width, height: raw.height, blob });
        }
        return found;
      } finally {
        page.cleanup();
      }
    },
    async render(n, canvas, widthPx, opts = {}) {
      const page = await pdf.getPage(n);
      try {
        if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        const natural = page.getViewport({ scale: 1 });
        const dpr = Math.min(opts.dpr ?? (typeof devicePixelRatio === "number" ? devicePixelRatio : 1), 2);
        const viewport = page.getViewport({ scale: (widthPx * dpr) / natural.width });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const task = page.render({ canvas, viewport, background: "#ffffff" });
        const stop = () => task.cancel();
        opts.signal?.addEventListener("abort", stop);
        try {
          await task.promise;
        } catch (e) {
          if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
          throw e;
        } finally {
          opts.signal?.removeEventListener("abort", stop);
        }
      } finally {
        page.cleanup();
      }
    },
  };
}

/** Opens `file` with pdf.js. Returns the shared document once it is ready, or a readable error. */
export function usePdfDocument(file: File | null): { doc: PdfDoc | null; pageCount: number; error?: string } {
  const [state, setState] = useState<State>({ doc: null });

  useEffect(() => {
    if (!file) return;
    let disposed = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/engines/vendor/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const pdf = await task.promise;
        if (disposed) return;
        setState({ doc: wrap(pdf) });
      } catch (e) {
        if (disposed) return;
        const error = e instanceof Error && /password/i.test(e.message)
          ? "This PDF needs a password to open. Use Remove PDF password first, then come back with the copy it saves."
          : "This file could not be read as a PDF.";
        setState({ doc: null, error });
      }
    })();
    return () => {
      disposed = true;
      // pdf.js 6 tears down through the loading task, not the document.
      void task?.destroy();
    };
  }, [file]);

  // A new file resets what we show, without a setState call in the effect.
  if (!file) return { doc: null, pageCount: 0 };
  return { doc: state.doc, pageCount: state.doc?.pageCount ?? 0, error: state.error };
}
