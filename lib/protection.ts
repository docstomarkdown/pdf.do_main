import { probePdf } from "./engines";

/**
 * plain       no encryption at all
 * restricted  encrypted, but it opens without a password (it may forbid printing or copying)
 * password    needs a password to open
 * unreadable  not a PDF this tool can read
 */
export type Protection = "plain" | "restricted" | "password" | "unreadable";

/** Sorts a file into one of the four, by asking qpdf and, when qpdf cannot open it, pdf.js (which reports a missing password by name). */
export async function classifyPdf(file: File, signal?: AbortSignal): Promise<Protection> {
  const probe = await probePdf(await file.arrayBuffer(), signal);
  if (probe.isEncrypted) return "restricted";
  if (probe.checkCode === 0 || probe.checkCode === 3) return "plain";
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/engines/vendor/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      await task.promise;
      return "plain";
    } finally {
      void task.destroy();
    }
  } catch (e) {
    return e instanceof Error && e.name === "PasswordException" ? "password" : "unreadable";
  }
}
