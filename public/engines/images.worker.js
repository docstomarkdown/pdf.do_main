/* Images engine: one PDF page per picture. JPEG and PNG are embedded as they are (JPEG is not recompressed); the page
   converts every other format to PNG before it gets here. Classic worker with a self-hosted pdf-lib.
   m.images: [{ buffer, kind: "jpeg" | "png" }]
   m.setup:  { size: "image" | "a4" | "letter", orientation: "auto" | "portrait" | "landscape", margin: points } */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument } = PDFLib;

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
// A picture with no page size of its own is laid out at 96 pixels to the inch, as a browser would show it.
const POINTS_PER_PIXEL = 0.75;

self.onmessage = async (event) => {
  const m = event.data;
  try {
    if (!m.images || !m.images.length) throw new Error("Choose at least one image.");
    const doc = await PDFDocument.create();
    for (let i = 0; i < m.images.length; i++) {
      const item = m.images[i];
      const image = item.kind === "jpeg" ? await doc.embedJpg(item.buffer) : await doc.embedPng(item.buffer);
      const margin = m.setup.margin;
      const iw = image.width * POINTS_PER_PIXEL;
      const ih = image.height * POINTS_PER_PIXEL;

      let pw;
      let ph;
      if (m.setup.size === "image") {
        pw = iw + margin * 2;
        ph = ih + margin * 2;
      } else {
        [pw, ph] = SIZES[m.setup.size];
        const landscape = m.setup.orientation === "landscape" || (m.setup.orientation === "auto" && image.width > image.height);
        if (landscape) [pw, ph] = [ph, pw];
      }
      const page = doc.addPage([pw, ph]);
      const room = [pw - margin * 2, ph - margin * 2];
      // Never enlarge a picture past its own size on a fixed page; shrink it to fit inside the margins.
      const scale = m.setup.size === "image" ? 1 : Math.min(room[0] / iw, room[1] / ih, 1);
      const w = iw * scale;
      const h = ih * scale;
      page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      self.postMessage({ progress: (i + 1) / m.images.length });
    }
    doc.setProducer("pdf.do");
    const bytes = await doc.save({ useObjectStreams: true });
    self.postMessage({ done: true, bytes, pages: m.images.length }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
