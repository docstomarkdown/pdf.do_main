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

/**
 * Bundles files into one ZIP. Names must already be safe and unique (see lib/zip-names.ts). PDFs and images are stored
 * as they are, since they are already compressed; other files are deflated. Resolves with the ZIP as a Blob.
 */
export async function zipFiles(files: { name: string; buffer: ArrayBuffer }[], onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<Blob> {
  const r = await callWorker<{ blob: Blob }>("/engines/zip.worker.js", { files, time: Date.now() }, { transfer: files.map((f) => f.buffer), onProgress, signal });
  return r.blob;
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

export type SplitFile = { bytes: Bytes; pages: number; first: number; last: number };

/** One new PDF per group of 1-based pages, in the order given. */
export async function splitPdf(buffer: ArrayBuffer, groups: number[][], onProgress?: (fraction: number) => void, signal?: AbortSignal) {
  return callWorker<{ files: SplitFile[]; total: number }>(PAGES, { op: "split", buffer, groups }, { transfer: [buffer], onProgress, signal });
}

/** Turns pages clockwise: `turns` maps a 1-based page to the degrees to add (90, 180 or 270). */
export async function rotatePdf(buffer: ArrayBuffer, turns: Record<number, number>, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number; turned: number }>(PAGES, { op: "rotate", buffer, turns }, { transfer: [buffer], signal });
}

export type NumberOptions = {
  /** The 1-based pages that get a number. */
  pages: number[];
  position: "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
  format: "n" | "page-n" | "n-of-m" | "page-n-of-m";
  /** The number on the first numbered page. */
  start: number;
  /** Text size in points. */
  size: number;
  /** Distance from the page edge in points. */
  margin: number;
  /**
   * A Bates identifier instead of a plain number: the prefix, the number padded with zeros to `digits`, the suffix
   * (ABC000123). `format` is then not used. The engine refuses a prefix or suffix its font cannot write.
   */
  bates?: { prefix: string; suffix: string; digits: number };
};

/** `firstLabel` and `lastLabel` are the text the engine wrote on the first and last numbered page. */
export async function numberPdf(buffer: ArrayBuffer, options: NumberOptions, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number; numbered: number; firstLabel: string; lastLabel: string }>(PAGES, { op: "numbers", buffer, options }, { transfer: [buffer], signal });
}

const META = "/engines/meta.worker.js";

export type PdfFields = { title: string; author: string; subject: string; keywords: string; creator: string; producer: string };

/** The document information of a PDF. Dates are ISO text, empty when the file has none. */
export async function readMeta(buffer: ArrayBuffer, signal?: AbortSignal) {
  return callWorker<{ fields: PdfFields; created: string; modified: string; hasXmp: boolean; pages: number }>(META, { op: "read", buffer }, { transfer: [buffer], signal });
}

/** Writes the fields into a copy of the PDF. An empty field is removed. */
export async function writeMeta(buffer: ArrayBuffer, fields: PdfFields, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; hasXmp: boolean }>(META, { op: "write", buffer, fields }, { transfer: [buffer], signal });
}

export type ImagePage = { buffer: ArrayBuffer; kind: "jpeg" | "png" };
export type PageSetup = { size: "image" | "a4" | "letter"; orientation: "auto" | "portrait" | "landscape"; margin: number };

/** One PDF page per picture, in the order given. */
export async function imagesToPdf(images: ImagePage[], setup: PageSetup, onProgress?: (fraction: number) => void, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number }>("/engines/images.worker.js", { images, setup }, { transfer: images.map((i) => i.buffer), onProgress, signal });
}

const SECURITY = "/engines/security.worker.js";

/** What qpdf finds: whether the file is encrypted yet opens without a password, and how a full check of it went (0 and 3 are fine). */
export async function probePdf(buffer: ArrayBuffer, signal?: AbortSignal) {
  return callWorker<{ isEncrypted: boolean; checkCode: number }>(SECURITY, { op: "probe", buffer }, { transfer: [buffer], signal });
}

/** A copy that needs `password` to open. AES-256. */
export async function encryptPdf(buffer: ArrayBuffer, password: string, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes }>(SECURITY, { op: "encrypt", buffer, password }, { transfer: [buffer], signal });
}

/** A copy with no encryption. Give the password when the file needs one to open; leave it out to lift restrictions only. */
export async function decryptPdf(buffer: ArrayBuffer, password?: string, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes }>(SECURITY, { op: "decrypt", buffer, password }, { transfer: [buffer], signal });
}

export const PASSWORD_REJECTED = "That password did not open the file.";

/** The pages of a new PDF in order: each is a page of the original (1-based) and a clockwise turn to add (0, 90, 180 or 270). */
export async function organizePdf(buffer: ArrayBuffer, order: { n: number; turn: number }[], signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number }>(PAGES, { op: "organize", buffer, order }, { transfer: [buffer], signal });
}

/** Each page cut into two pages, left and right ("vertical") or top and bottom ("horizontal"), first half first. */
export async function halvePages(buffer: ArrayBuffer, direction: "vertical" | "horizontal", signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number }>(PAGES, { op: "halves", buffer, direction }, { transfer: [buffer], signal });
}

export type CropMargins = { top: number; right: number; bottom: number; left: number };

/** Crops the given pages by fractions (0 to 0.45) of the page as seen. The cut-off area stays in the file, hidden. */
export async function cropPdf(buffer: ArrayBuffer, crop: CropMargins, pages: number[], signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number; cropped: number }>(PAGES, { op: "crop", buffer, crop, pages }, { transfer: [buffer], signal });
}

/** Packs pages in order into files of at most `limit` bytes. A single page over the limit gets its own file, marked `over`. */
export async function splitBySize(buffer: ArrayBuffer, limit: number, onProgress?: (fraction: number) => void, signal?: AbortSignal) {
  return callWorker<{ files: (SplitFile & { over: boolean })[]; total: number }>(PAGES, { op: "bySize", buffer, limit }, { transfer: [buffer], onProgress, signal });
}

export type SizeReport = {
  total: number;
  parts: { images: number; fonts: number; content: number; other: number; structure: number };
  images: { width: number; height: number; filter: string; bytes: number }[];
  imageCount: number;
  fonts: number;
  pages: number;
};

/** What the bytes of a PDF are made of. */
export async function analyzePdf(buffer: ArrayBuffer, signal?: AbortSignal) {
  return callWorker<SizeReport>("/engines/analyze.worker.js", { buffer }, { transfer: [buffer], signal });
}

export type TextSetup = { size: "a4" | "letter"; margin: number };

/** Plain text laid out on pages. Characters the standard fonts lack come back as "?" and are counted in `replaced`. */
export async function textToPdf(text: string, setup: TextSetup, font: "helvetica" | "times" | "courier", fontSize: number, onProgress?: (fraction: number) => void, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; replaced: number }>("/engines/text.worker.js", { text, setup, font, fontSize }, { onProgress, signal });
}

export type Watermark = {
  text: string;
  /** Text size in points. */
  size: number;
  opacity: number;
  /** Degrees counter-clockwise, on the page as seen. */
  rotate: number;
  color: [number, number, number];
  /** The centre, as percentages of the page as seen, from its top left. */
  x: number;
  y: number;
};

/** Writes text across the given pages. Characters the standard font lacks come back as "?" and are counted in `replaced`. */
export async function watermarkPdf(buffer: ArrayBuffer, mark: Watermark, pages: number[], signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number; marked: number; replaced: number }>(PAGES, { op: "watermark", buffer, mark, pages }, { transfer: [buffer], signal });
}

export type Signature = {
  image: ArrayBuffer;
  jpeg: boolean;
  /** The centre, as percentages of the page as seen, from its top left. */
  x: number;
  y: number;
  /** Width as a percentage of the page's width. The height follows the picture's shape. */
  width: number;
};

/** Puts a picture of a signature on the given pages. This is a picture, not a digital signature. */
export async function signPdf(buffer: ArrayBuffer, sign: Signature, pages: number[], signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number; signed: number }>(PAGES, { op: "sign", buffer, sign, pages }, { transfer: [buffer, sign.image], signal });
}

/** A copy written out again with a fresh index, from the objects that can be read. `mended` is true when qpdf could not read the original. */
export async function repairPdf(buffer: ArrayBuffer, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; mended: boolean }>(SECURITY, { op: "repair", buffer }, { transfer: [buffer], signal });
}

export type FormField = { name: string; readOnly: boolean; kind: "text" | "check" | "radio" | "choice" | "other"; value: string | boolean; options?: string[]; multiline?: boolean };

/** The form fields of a PDF, with their current values. Empty when the file has none. */
export async function readForm(buffer: ArrayBuffer, signal?: AbortSignal) {
  return callWorker<{ fields: FormField[] }>(PAGES, { op: "formRead", buffer }, { transfer: [buffer], signal });
}

/** Fills the named fields. With `flatten` the entries become part of the page and the fields are removed. */
export async function fillForm(buffer: ArrayBuffer, values: Record<string, string | boolean>, flatten: boolean, signal?: AbortSignal) {
  return callWorker<{ bytes: Bytes; pages: number; total: number; changed: number }>(PAGES, { op: "formFill", buffer, values, flatten }, { transfer: [buffer], signal });
}

export type PrivacyFinding = { id: string; tone: "ok" | "warn" | "bad"; title: string; detail: string };

/** The common places a PDF carries more than its pages show. Never changes the file. */
export async function scanPrivacy(buffer: ArrayBuffer, signal?: AbortSignal) {
  return callWorker<{ findings: PrivacyFinding[] }>("/engines/privacy.worker.js", { buffer }, { transfer: [buffer], signal });
}
