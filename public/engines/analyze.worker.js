/* Size analysis: what a PDF's bytes are made of. Classic worker with a self-hosted pdf-lib.
   Walks the file's stream objects and sorts them into pictures, fonts, page content and other streams. Everything left
   (the file's own structure, and objects that were packed inside object streams) is reported as "structure".
   Post: { done, total, parts: { images, fonts, content, other, structure }, images: [{ width, height, filter, bytes }], fonts, pages } */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFNumber, PDFStream } = PDFLib;

const FONT_FILES = ["FontFile", "FontFile2", "FontFile3"];

self.onmessage = async (event) => {
  const m = event.data;
  try {
    const doc = await PDFDocument.load(m.buffer, { ignoreEncryption: true, updateMetadata: false });
    if (doc.isEncrypted) throw new Error("This PDF is encrypted. If it needs a password to open, use Remove PDF password first. If it opens but forbids changes, use Unlock PDF first.");
    const context = doc.context;
    const fontStreams = new Set();
    const contentStreams = new Set();
    for (const [, object] of context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFDict)) continue;
      for (const key of FONT_FILES) {
        const value = object.get(PDFName.of(key));
        if (value instanceof PDFRef) fontStreams.add(value.tag);
      }
    }
    for (const page of doc.getPages()) {
      const contents = page.node.get(PDFName.of("Contents"));
      if (contents instanceof PDFRef) contentStreams.add(contents.tag);
      if (contents instanceof PDFArray) for (let i = 0; i < contents.size(); i++) { const ref = contents.get(i); if (ref instanceof PDFRef) contentStreams.add(ref.tag); }
    }

    const parts = { images: 0, fonts: 0, content: 0, other: 0 };
    const images = [];
    let fonts = 0;
    for (const [ref, object] of context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFStream)) continue;
      const bytes = object.getContentsSize();
      const subtype = object.dict.get(PDFName.of("Subtype"));
      if (subtype === PDFName.of("Image")) {
        parts.images += bytes;
        const number = (key) => { const v = object.dict.get(PDFName.of(key)); return v instanceof PDFNumber ? v.asNumber() : 0; };
        const filter = object.dict.get(PDFName.of("Filter"));
        const first = filter instanceof PDFArray ? filter.get(0) : filter;
        images.push({ width: number("Width"), height: number("Height"), filter: first ? String(first.asString ? first.asString() : first).replace("/", "") : "none", bytes });
      } else if (fontStreams.has(ref.tag)) {
        parts.fonts += bytes;
        fonts++;
      } else if (contentStreams.has(ref.tag)) {
        parts.content += bytes;
      } else {
        parts.other += bytes;
      }
    }
    const total = m.buffer.byteLength;
    const structure = Math.max(0, total - parts.images - parts.fonts - parts.content - parts.other);
    images.sort((a, b) => b.bytes - a.bytes);
    self.postMessage({ done: true, total, parts: { ...parts, structure }, images: images.slice(0, 8), imageCount: images.length, fonts, pages: doc.getPageCount() });
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
