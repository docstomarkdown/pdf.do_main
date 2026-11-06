/* Text to PDF: lays plain text out on pages with one of the PDF standard fonts. Classic worker with a self-hosted pdf-lib.
   The standard fonts cover Latin letters only: any other character is replaced by "?" and counted in `replaced`.
   m.text, m.setup: { size: "a4" | "letter", margin: points }, m.font: "helvetica" | "times" | "courier", m.fontSize: points */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument, StandardFonts } = PDFLib;

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
const FONTS = { helvetica: StandardFonts.Helvetica, times: StandardFonts.TimesRoman, courier: StandardFonts.Courier };

self.onmessage = async (event) => {
  const m = event.data;
  try {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(FONTS[m.font] || FONTS.helvetica);
    const known = new Set(font.getCharacterSet());
    let replaced = 0;
    let text = "";
    for (const ch of m.text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ")) {
      if (ch === "\n" || known.has(ch.codePointAt(0))) text += ch;
      else { text += "?"; replaced++; }
    }

    const [pw, ph] = SIZES[m.setup.size] || SIZES.a4;
    const margin = m.setup.margin;
    const width = pw - margin * 2;
    const lineHeight = m.fontSize * 1.35;
    const perPage = Math.max(1, Math.floor((ph - margin * 2) / lineHeight));

    const lines = [];
    for (const paragraph of text.split("\n")) {
      if (paragraph === "") { lines.push(""); continue; }
      let line = "";
      for (const word of paragraph.split(/(?<=\s)/)) {
        const candidate = line + word;
        if (font.widthOfTextAtSize(candidate.trimEnd(), m.fontSize) <= width) { line = candidate; continue; }
        if (line !== "") { lines.push(line.trimEnd()); line = ""; }
        let rest = word;
        // A word longer than a whole line is broken where it runs out of room.
        while (font.widthOfTextAtSize(rest.trimEnd(), m.fontSize) > width) {
          let cut = rest.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), m.fontSize) > width) cut--;
          lines.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      lines.push(line.trimEnd());
    }

    for (let i = 0; i < lines.length || i === 0; i += perPage) {
      const page = doc.addPage([pw, ph]);
      lines.slice(i, i + perPage).forEach((line, row) => {
        if (line !== "") page.drawText(line, { x: margin, y: ph - margin - m.fontSize - row * lineHeight, size: m.fontSize, font });
      });
      self.postMessage({ progress: Math.min(1, (i + perPage) / Math.max(1, lines.length)) });
    }
    doc.setProducer("pdf.do");
    const bytes = await doc.save({ useObjectStreams: true });
    self.postMessage({ done: true, bytes, pages: doc.getPageCount(), replaced }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
