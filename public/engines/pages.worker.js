/* Page engine: delete pages from a PDF, or extract pages into a new one. Pages are 1-based.
   Classic worker with a self-hosted pdf-lib, like the other engines. */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument } = PDFLib;

self.onmessage = async (event) => {
  const m = event.data;
  try {
    const src = await PDFDocument.load(m.buffer, { ignoreEncryption: true, updateMetadata: false });
    if (src.isEncrypted) throw new Error("This PDF is password-protected. Password support is not built yet.");
    const total = src.getPageCount();
    const chosen = [...new Set(m.pages)].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    if (!chosen.length) throw new Error("No pages were selected.");

    let out;
    if (m.op === "delete") {
      if (chosen.length >= total) throw new Error("That would delete every page. Keep at least one.");
      // Remove from the end so earlier indexes stay valid. This keeps the rest of the document as it was.
      for (const n of [...chosen].reverse()) src.removePage(n - 1);
      out = src;
    } else if (m.op === "extract") {
      out = await PDFDocument.create();
      const pages = await out.copyPages(src, chosen.map((n) => n - 1));
      pages.forEach((p) => out.addPage(p));
    } else {
      throw new Error("Unknown operation: " + m.op);
    }
    out.setProducer("pdf.do");
    const bytes = await out.save({ useObjectStreams: true });
    self.postMessage({ done: true, bytes, pages: out.getPageCount(), total }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
