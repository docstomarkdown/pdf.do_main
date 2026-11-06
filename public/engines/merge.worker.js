/* Merge / inspect engine. Classic worker so it needs no bundler and runs under a
   strict same-origin policy. pdf-lib is self-hosted in /engines/vendor. */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument } = PDFLib;

async function loadChecked(buffer, label) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
  if (doc.isEncrypted) {
    throw new Error(label + " is password-protected. Password support is not built yet.");
  }
  return doc;
}

self.onmessage = async (event) => {
  const m = event.data;
  try {
    if (m.op === "inspect") {
      const doc = await loadChecked(m.buffer, "This PDF");
      self.postMessage({ done: true, pages: doc.getPageCount() });
    } else if (m.op === "merge") {
      const out = await PDFDocument.create();
      for (let i = 0; i < m.buffers.length; i++) {
        const src = await loadChecked(m.buffers[i], m.names[i]);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        self.postMessage({ progress: (i + 1) / m.buffers.length });
      }
      out.setProducer("pdf.do");
      out.setCreator("pdf.do");
      const bytes = await out.save({ useObjectStreams: true });
      self.postMessage({ done: true, bytes }, [bytes.buffer]);
    } else {
      throw new Error("Unknown operation: " + m.op);
    }
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
