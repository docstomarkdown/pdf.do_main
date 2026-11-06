/* Compress engine. Two operations:
   - qpdf:     structure + image optimisation through qpdf (WASM). Keeps text selectable.
   - assemble: rebuilds a PDF from JPEG page images (used by target-size mode).
   Classic worker; qpdf.js defines a global `Module` and pdf-lib.min.js defines `PDFLib`. */
importScripts("/engines/vendor/pdf-lib.min.js", "/engines/vendor/qpdf.js");

async function runQpdf(buffer, optimizeImages) {
  const log = [];
  const qpdf = await Module({
    locateFile: () => "/engines/vendor/qpdf.wasm",
    print: (t) => log.push(String(t)),
    printErr: (t) => log.push(String(t)),
  });
  qpdf.FS.writeFile("/in.pdf", new Uint8Array(buffer));
  const args = ["/in.pdf", "--object-streams=generate", "--compress-streams=y", "--recompress-flate", "--compression-level=9"];
  if (optimizeImages) args.push("--optimize-images");
  args.push("/out.pdf");
  const code = qpdf.callMain(args);
  // qpdf exit codes: 0 ok, 3 ok with warnings, 2 error.
  if (code !== 0 && code !== 3) {
    throw new Error("qpdf could not process this file (exit " + code + "). " + log.slice(-2).join(" "));
  }
  return { bytes: qpdf.FS.readFile("/out.pdf"), log: log.slice(-5) };
}

async function assemble(pages) {
  const { PDFDocument } = PDFLib;
  const doc = await PDFDocument.create();
  for (const p of pages) {
    const img = await doc.embedJpg(new Uint8Array(p.jpeg));
    const page = doc.addPage([p.widthPt, p.heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
  }
  doc.setProducer("pdf.do");
  return doc.save({ useObjectStreams: true });
}

self.onmessage = async (event) => {
  const m = event.data;
  try {
    if (m.op === "qpdf") {
      const r = await runQpdf(m.buffer, m.optimizeImages);
      self.postMessage({ done: true, bytes: r.bytes, log: r.log }, [r.bytes.buffer]);
    } else if (m.op === "assemble") {
      const bytes = await assemble(m.pages);
      self.postMessage({ done: true, bytes }, [bytes.buffer]);
    } else {
      throw new Error("Unknown operation: " + m.op);
    }
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
