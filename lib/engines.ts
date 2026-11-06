import { callWorker } from "./worker-rpc";

const MERGE = "/engines/merge.worker.js";
const COMPRESS = "/engines/compress.worker.js";

export type Bytes = Uint8Array<ArrayBuffer>;
export type JpegPage = { jpeg: ArrayBuffer; widthPt: number; heightPt: number };

/** Page count of a PDF. Rejects with a readable message for password-protected files. */
export async function inspectPdf(buffer: ArrayBuffer, signal?: AbortSignal): Promise<number> {
  const r = await callWorker<{ pages: number }>(MERGE, { op: "inspect", buffer }, { transfer: [buffer], signal });
  return r.pages;
}

export async function mergePdfs(
  buffers: ArrayBuffer[],
  names: string[],
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<Bytes> {
  const r = await callWorker<{ bytes: Bytes }>(MERGE, { op: "merge", buffers, names }, { transfer: buffers, onProgress, signal });
  return r.bytes;
}

export async function qpdfCompress(buffer: ArrayBuffer, optimizeImages: boolean, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; log: string[] }>(COMPRESS, { op: "qpdf", buffer, optimizeImages }, { transfer: [buffer], signal });
}

export async function assembleJpegPages(pages: JpegPage[], signal?: AbortSignal): Promise<Bytes> {
  const r = await callWorker<{ bytes: Bytes }>(COMPRESS, { op: "assemble", pages }, { transfer: pages.map((p) => p.jpeg), signal });
  return r.bytes;
}

const PAGES = "/engines/pages.worker.js";

/** Removes the given 1-based pages. Rejects when every page would go, or the file is password-protected. */
export async function removePages(buffer: ArrayBuffer, pages: number[], signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number }>(PAGES, { op: "delete", buffer, pages }, { transfer: [buffer], signal });
}

/** Builds a new PDF from the given 1-based pages, in their original order. */
export async function extractPages(buffer: ArrayBuffer, pages: number[], signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number }>(PAGES, { op: "extract", buffer, pages }, { transfer: [buffer], signal });
}
