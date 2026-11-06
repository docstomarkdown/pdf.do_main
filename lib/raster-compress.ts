import { assembleJpegPages, type Bytes, type JpegPage } from "./engines";

/**
 * Target-size fallback: when qpdf cannot reach a size, rebuild the PDF from page
 * images and step down resolution and JPEG quality until it fits. Text stops being
 * selectable, so the UI must say so. Runs pdf.js on the main thread (its parser
 * has its own worker); the final assembly happens in the compress worker.
 */
const DPIS = [150, 110, 80, 60];
const QUALITIES = [0.92, 0.75, 0.6, 0.45, 0.3];
export const RASTER_PAGE_LIMIT = 100;

type Master = { blob: Blob; widthPt: number; heightPt: number };
export type RasterResult = { bytes: Bytes; dpi: number; quality: number; reached: boolean };

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode a page image."))), "image/jpeg", quality),
  );
}

async function reencode(master: Master, quality: number, canvas: HTMLCanvasElement): Promise<Blob> {
  const bitmap = await createImageBitmap(master.blob);
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return toJpeg(canvas, quality);
}

function check(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

export async function rasterCompress(
  source: ArrayBuffer,
  targetBytes: number,
  opts: { onStatus: (message: string) => void; signal?: AbortSignal },
): Promise<RasterResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/engines/vendor/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(source.slice(0)) });
  const doc = await task.promise;
  const canvas = document.createElement("canvas");
  try {
    if (doc.numPages > RASTER_PAGE_LIMIT) {
      throw new Error(`Target-size mode handles up to ${RASTER_PAGE_LIMIT} pages for now; this file has ${doc.numPages}.`);
    }
    let best: Bytes | null = null;
    let bestInfo = { dpi: 0, quality: 0 };

    for (const dpi of DPIS) {
      const masters: Master[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        check(opts.signal);
        opts.onStatus(`Rendering page ${n} of ${doc.numPages} at ${dpi} dpi…`);
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: dpi / 72 });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport, background: "#ffffff" }).promise;
        masters.push({ blob: await toJpeg(canvas, QUALITIES[0]), widthPt: base.width, heightPt: base.height });
        page.cleanup();
      }
      for (const quality of QUALITIES) {
        check(opts.signal);
        opts.onStatus(`Trying ${dpi} dpi at quality ${Math.round(quality * 100)}…`);
        const pages: JpegPage[] = [];
        for (const m of masters) {
          const blob = quality === QUALITIES[0] ? m.blob : await reencode(m, quality, canvas);
          pages.push({ jpeg: await blob.arrayBuffer(), widthPt: m.widthPt, heightPt: m.heightPt });
        }
        const bytes = await assembleJpegPages(pages, opts.signal);
        if (!best || bytes.length < best.length) {
          best = bytes;
          bestInfo = { dpi, quality };
        }
        if (bytes.length <= targetBytes) return { bytes, dpi, quality, reached: true };
      }
    }
    return { bytes: best!, ...bestInfo, reached: false };
  } finally {
    canvas.width = 0;
    await task.destroy();
  }
}
