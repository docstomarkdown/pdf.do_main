/* Page engine: delete, extract, split, rotate and number the pages of a PDF. Pages are 1-based.
   Classic worker with a self-hosted pdf-lib, like the other engines. Every operation posts one final message:
   { done: true, ... }, or { error } with a message a person can read. */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument, StandardFonts, BlendMode, LineCapStyle, degrees, rgb } = PDFLib;

const OPTIONS = { useObjectStreams: true };

function chosenPages(pages, total) {
  return [...new Set(pages || [])].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

async function copyOut(src, pages) {
  const out = await PDFDocument.create();
  (await out.copyPages(src, pages.map((n) => n - 1))).forEach((p) => out.addPage(p));
  out.setProducer("pdf.do");
  return out;
}


/** A page's box as [x0, y0, x1, y1]: its crop box when it has one, otherwise its media box. */
function boxOf(page) {
  const b = page.getCropBox();
  return [b.x, b.y, b.x + b.width, b.y + b.height];
}

function setBoxes(page, [x0, y0, x1, y1]) {
  page.setMediaBox(x0, y0, x1 - x0, y1 - y0);
  page.setCropBox(x0, y0, x1 - x0, y1 - y0);
}

const turnOf = (page) => ((page.getRotation().angle % 360) + 360) % 360;

const operations = {
  async delete(src, m, total) {
    const chosen = chosenPages(m.pages, total);
    if (!chosen.length) throw new Error("No pages were selected.");
    if (chosen.length >= total) throw new Error("That would delete every page. Keep at least one.");
    // Remove from the end so earlier indexes stay valid. This keeps the rest of the document as it was.
    for (const n of [...chosen].reverse()) src.removePage(n - 1);
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: src.getPageCount(), total }, [bytes.buffer]);
  },

  async extract(src, m, total) {
    const chosen = chosenPages(m.pages, total);
    if (!chosen.length) throw new Error("No pages were selected.");
    const out = await copyOut(src, chosen);
    const bytes = await out.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: out.getPageCount(), total }, [bytes.buffer]);
  },

  /** m.groups: a list of page lists. One new PDF per group, in the order given. */
  async split(src, m, total) {
    const files = [];
    const transfer = [];
    for (let i = 0; i < m.groups.length; i++) {
      const pages = chosenPages(m.groups[i], total);
      if (!pages.length) continue;
      const out = await copyOut(src, pages);
      const bytes = await out.save(OPTIONS);
      files.push({ bytes, pages: pages.length, first: pages[0], last: pages[pages.length - 1] });
      transfer.push(bytes.buffer);
      self.postMessage({ progress: (i + 1) / m.groups.length });
    }
    if (!files.length) throw new Error("No pages were selected.");
    self.postMessage({ done: true, files, total }, transfer);
  },

  /** m.turns: { "3": 90, "5": 270 }, the quarter turns to add to each page, clockwise, in degrees. */
  async rotate(src, m, total) {
    const turns = Object.entries(m.turns || {})
      .map(([n, angle]) => [Number(n), Number(angle)])
      .filter(([n, angle]) => n >= 1 && n <= total && angle % 90 === 0 && angle % 360 !== 0);
    if (!turns.length) throw new Error("Nothing was turned. Turn at least one page first.");
    for (const [n, angle] of turns) {
      const page = src.getPage(n - 1);
      page.setRotation(degrees((((page.getRotation().angle + angle) % 360) + 360) % 360));
    }
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, turned: turns.length }, [bytes.buffer]);
  },

  /**
   * m.direction: "vertical" cuts each page into a left and a right half, "horizontal" into a top and a bottom half, as the
   * page is seen. Each page becomes two pages, first half first. The cut is made by setting the page's boxes; what lies outside
   * a half stays in the file, hidden.
   */
  async halves(src, m, total) {
    const out = await PDFDocument.create();
    const order = [];
    for (let n = 1; n <= total; n++) order.push(n - 1, n - 1);
    const copies = await out.copyPages(src, order);
    for (let n = 0; n < total; n++) {
      const turn = turnOf(src.getPage(n));
      const [x0, y0, x1, y1] = boxOf(src.getPage(n));
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      // The two pieces in the page's own axes, first piece first, for each way the page is turned.
      const vertical = { 0: [[x0, y0, mx, y1], [mx, y0, x1, y1]], 90: [[x0, y0, x1, my], [x0, my, x1, y1]], 180: [[mx, y0, x1, y1], [x0, y0, mx, y1]], 270: [[x0, my, x1, y1], [x0, y0, x1, my]] };
      const horizontal = { 0: [[x0, my, x1, y1], [x0, y0, x1, my]], 90: [[x0, y0, mx, y1], [mx, y0, x1, y1]], 180: [[x0, y0, x1, my], [x0, my, x1, y1]], 270: [[mx, y0, x1, y1], [x0, y0, mx, y1]] };
      const pieces = (m.direction === "horizontal" ? horizontal : vertical)[turn];
      for (let k = 0; k < 2; k++) {
        const page = copies[n * 2 + k];
        setBoxes(page, pieces[k]);
        out.addPage(page);
      }
    }
    out.setProducer("pdf.do");
    const bytes = await out.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total * 2, total }, [bytes.buffer]);
  },

  /**
   * m.crop: { top, right, bottom, left } as fractions (0 to 0.45) of the page as it is seen; m.pages: the pages to crop.
   * Sets the page's boxes. What lies outside stays in the file, hidden.
   */
  async crop(src, m, total) {
    const pages = chosenPages(m.pages, total);
    if (!pages.length) throw new Error("No pages were selected.");
    const c = m.crop;
    for (const n of pages) {
      const page = src.getPage(n - 1);
      const turn = turnOf(page);
      const box = boxOf(page);
      const [x0, y0, x1, y1] = box;
      const vw = turn % 180 === 0 ? x1 - x0 : y1 - y0;
      const vh = turn % 180 === 0 ? y1 - y0 : x1 - x0;
      const mL = c.left * vw;
      const mR = c.right * vw;
      const mT = c.top * vh;
      const mB = c.bottom * vh;
      const next = {
        0: [x0 + mL, y0 + mB, x1 - mR, y1 - mT],
        90: [x0 + mT, y0 + mL, x1 - mB, y1 - mR],
        180: [x0 + mR, y0 + mT, x1 - mL, y1 - mB],
        270: [x0 + mB, y0 + mR, x1 - mT, y1 - mL],
      }[turn];
      if (next[2] - next[0] < 10 || next[3] - next[1] < 10) throw new Error("That crop leaves almost nothing of page " + n + ".");
      setBoxes(page, next);
    }
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, cropped: pages.length }, [bytes.buffer]);
  },

  /**
   * m.limit: the most bytes each file may take. Pages are packed in order, as many to a file as fit; a page that is bigger
   * than the limit on its own gets a file to itself and is marked `over`.
   */
  async bySize(src, m, total) {
    const trial = async (from, to) => {
      const out = await PDFDocument.create();
      const pages = [];
      for (let n = from; n <= to; n++) pages.push(n - 1);
      (await out.copyPages(src, pages)).forEach((p) => out.addPage(p));
      out.setProducer("pdf.do");
      return out.save(OPTIONS);
    };
    const files = [];
    const transfer = [];
    let start = 1;
    while (start <= total) {
      let best = await trial(start, start);
      let end = start;
      // Grow while it still fits, doubling and then narrowing down, so a long file needs few trial saves.
      let step = 1;
      while (end + step <= total && best.length <= m.limit) {
        const bytes = await trial(start, end + step);
        if (bytes.length <= m.limit) { best = bytes; end += step; step *= 2; } else if (step === 1) break; else step = Math.max(1, Math.floor(step / 2));
      }
      files.push({ bytes: best, pages: end - start + 1, first: start, last: end, over: best.length > m.limit });
      transfer.push(best.buffer);
      self.postMessage({ progress: end / total });
      start = end + 1;
    }
    self.postMessage({ done: true, files, total }, transfer);
  },

  /**
   * m.mark: { text, size (points), opacity (0 to 1), rotate (degrees counter-clockwise on the page as seen), color: [r, g, b] (0 to 1),
   * x, y (the centre, as percentages of the page as seen, from its top left) }; m.pages: the pages to mark. Text in Helvetica Bold:
   * characters outside it are replaced by "?" and counted in `replaced`.
   */
  async watermark(src, m, total) {
    const pages = chosenPages(m.pages, total);
    if (!pages.length) throw new Error("No pages were selected.");
    const font = await src.embedFont(StandardFonts.HelveticaBold);
    const known = new Set(font.getCharacterSet());
    let replaced = 0;
    let text = "";
    for (const ch of m.mark.text) {
      if (known.has(ch.codePointAt(0))) text += ch; else { text += "?"; replaced++; }
    }
    if (text.trim() === "") throw new Error("Type the text for the watermark.");
    const width = font.widthOfTextAtSize(text, m.mark.size);
    for (const n of pages) {
      const page = src.getPage(n - 1);
      const { width: w, height: h } = page.getSize();
      const turn = turnOf(page);
      const vw = turn % 180 === 0 ? w : h;
      const vh = turn % 180 === 0 ? h : w;
      const vx = (m.mark.x / 100) * vw;
      const vy = (1 - m.mark.y / 100) * vh;
      const [cx, cy] = { 0: [vx, vy], 90: [w - vy, vx], 180: [w - vx, h - vy], 270: [vy, h - vx] }[turn];
      const angle = turn + m.mark.rotate;
      const rad = (angle * Math.PI) / 180;
      const half = m.mark.size * 0.36;
      page.drawText(text, {
        x: cx - (width / 2) * Math.cos(rad) + half * Math.sin(rad),
        y: cy - (width / 2) * Math.sin(rad) - half * Math.cos(rad),
        size: m.mark.size, font, rotate: degrees(angle), opacity: m.mark.opacity,
        color: rgb(m.mark.color[0], m.mark.color[1], m.mark.color[2]),
      });
    }
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, marked: pages.length, replaced }, [bytes.buffer]);
  },

  /**
   * m.sign: { image: ArrayBuffer (a PNG, or a JPEG when `jpeg` is set), x, y (the centre, percent of the page as seen, from its
   * top left), width (percent of the page's width as seen) }; m.pages: the pages to sign. The picture is drawn on the page;
   * this is not a digital signature.
   */
  async sign(src, m, total) {
    const pages = chosenPages(m.pages, total);
    if (!pages.length) throw new Error("No pages were selected.");
    const image = m.sign.jpeg ? await src.embedJpg(m.sign.image) : await src.embedPng(m.sign.image);
    for (const n of pages) {
      const page = src.getPage(n - 1);
      const { width: w, height: h } = page.getSize();
      const turn = turnOf(page);
      const vw = turn % 180 === 0 ? w : h;
      const vh = turn % 180 === 0 ? h : w;
      const wi = (m.sign.width / 100) * vw;
      const hi = (wi * image.height) / image.width;
      const vx = (m.sign.x / 100) * vw;
      const vy = (1 - m.sign.y / 100) * vh;
      const [cx, cy] = { 0: [vx, vy], 90: [w - vy, vx], 180: [w - vx, h - vy], 270: [vy, h - vx] }[turn];
      const rad = (turn * Math.PI) / 180;
      page.drawImage(image, {
        x: cx - (wi / 2) * Math.cos(rad) + (hi / 2) * Math.sin(rad),
        y: cy - (wi / 2) * Math.sin(rad) - (hi / 2) * Math.cos(rad),
        width: wi, height: hi, rotate: degrees(turn),
      });
    }
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, signed: pages.length }, [bytes.buffer]);
  },

  /** Lists the form fields of the file: name, kind, current value, choices. Nothing is changed. */
  async formRead(src) {
    const { PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = PDFLib;
    const fields = src.getForm().getFields().map((f) => {
      const base = { name: f.getName(), readOnly: f.isReadOnly() };
      if (f instanceof PDFTextField) return { ...base, kind: "text", value: f.getText() || "", multiline: f.isMultiline() };
      if (f instanceof PDFCheckBox) return { ...base, kind: "check", value: f.isChecked() };
      if (f instanceof PDFRadioGroup) return { ...base, kind: "radio", value: f.getSelected() || "", options: f.getOptions() };
      if (f instanceof PDFDropdown) return { ...base, kind: "choice", value: (f.getSelected() || [])[0] || "", options: f.getOptions() };
      if (f instanceof PDFOptionList) return { ...base, kind: "choice", value: (f.getSelected() || [])[0] || "", options: f.getOptions() };
      return { ...base, kind: "other" };
    });
    self.postMessage({ done: true, fields });
  },

  /**
   * Adds form fields to the file. m.fields: each { page (1-based), kind: "text" | "multiline" | "check", name, x, y (the
   * centre), width, height (percentages of the page, from its top left) }. Refused, with nothing written: a name the file
   * already uses, a name used twice, an empty name, a name with a full stop (PDF uses the full stop to nest fields), and
   * a field on a turned page (it would sit sideways, which is not handled yet).
   */
  async formAdd(src, m, total) {
    const fields = (m.fields || []).map((f) => ({ ...f, name: String(f.name || "").trim() }));
    if (!fields.length) throw new Error("There are no fields to add yet.");
    const form = src.getForm();
    const inFile = new Set(form.getFields().map((f) => f.getName()));
    const seen = new Set();
    for (const f of fields) {
      if (f.name === "") throw new Error("Every field needs a name.");
      if (f.name.includes(".")) throw new Error(`“${f.name}” has a full stop in it. A field name cannot use one.`);
      if (inFile.has(f.name)) throw new Error(`This PDF already has a field called “${f.name}”. Give the new one another name.`);
      if (seen.has(f.name)) throw new Error(`“${f.name}” is used by more than one field. Every field needs its own name.`);
      seen.add(f.name);
      if (!(f.page >= 1 && f.page <= total)) throw new Error("A field is on a page this PDF does not have.");
      if (turnOf(src.getPage(f.page - 1)) !== 0) throw new Error(`Page ${f.page} is turned sideways. Fields cannot be added to a turned page yet.`);
    }
    const touched = new Set();
    for (const f of fields) {
      const page = src.getPage(f.page - 1);
      const { width: w, height: h } = page.getSize();
      const wi = (f.width / 100) * w;
      const hi = (f.height / 100) * h;
      const box = { x: (f.x / 100) * w - wi / 2, y: (1 - f.y / 100) * h - hi / 2, width: wi, height: hi, borderWidth: 0.75, borderColor: rgb(0.42, 0.47, 0.55) };
      if (f.kind === "check") {
        form.createCheckBox(f.name).addToPage(page, box);
      } else {
        const field = form.createTextField(f.name);
        if (f.kind === "multiline") field.enableMultiline();
        field.addToPage(page, box);
        field.setFontSize(11);
      }
      touched.add(f.page);
    }
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, added: fields.length, touched: touched.size }, [bytes.buffer]);
  },

  /** m.values: { fieldName: text | boolean }, m.flatten: make the entries permanent and remove the fields. */
  async formFill(src, m, total) {
    const { PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = PDFLib;
    const form = src.getForm();
    let changed = 0;
    for (const f of form.getFields()) {
      const name = f.getName();
      if (!(name in m.values) || f.isReadOnly()) continue;
      const value = m.values[name];
      if (f instanceof PDFTextField) f.setText(String(value) === "" ? undefined : String(value));
      else if (f instanceof PDFCheckBox) { if (value) f.check(); else f.uncheck(); }
      else if (f instanceof PDFRadioGroup || f instanceof PDFDropdown || f instanceof PDFOptionList) { if (value === "") { if (f.clear) f.clear(); } else f.select(String(value)); }
      else continue;
      changed++;
    }
    if (m.flatten) form.flatten();
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, changed }, [bytes.buffer]);
  },

  /** m.order: [{ n, turn }]: the pages of the new file in order, each a source page (1-based) with a clockwise turn to add. */
  async organize(src, m, total) {
    const order = (m.order || []).filter((p) => p.n >= 1 && p.n <= total);
    if (!order.length) throw new Error("A PDF needs at least one page.");
    const out = await PDFDocument.create();
    const copies = await out.copyPages(src, order.map((p) => p.n - 1));
    copies.forEach((page, i) => {
      const was = src.getPage(order[i].n - 1).getRotation().angle;
      page.setRotation(degrees((((was + (order[i].turn || 0)) % 360) + 360) % 360));
      out.addPage(page);
    });
    out.setProducer("pdf.do");
    const bytes = await out.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: order.length, total }, [bytes.buffer]);
  },

  /**
   * Draws a list of things on pages. m.items: each { page (1-based), kind, ... }, with positions as percentages of the page
   * as seen, from its top left:
   *   "text": { x, y (the centre of the block), text (line breaks allowed), size (points), color: [r, g, b], bold }
   *           Helvetica. A character it cannot write is refused, never swapped for another.
   *   "rect": { x, y (the centre), width, height, color, opacity (0 to 1), fill } filled and see-through (a highlight, which
   *           darkens what is under it instead of hiding it), or with `fill` false an outline `line` points thick.
   *   "path": { points: [[x, y], ...], color, opacity, line (points) } a freehand line through the points.
   * Text that is only spaces is left out. The answer counts what was drawn and the pages it is on.
   */
  async draw(src, m, total) {
    const items = (m.items || []).filter((it) => it.page >= 1 && it.page <= total && (it.kind !== "text" || String(it.text || "").trim() !== ""));
    if (!items.length) throw new Error("There is nothing to add yet.");
    const fonts = {};
    const fontFor = async (bold) => (fonts[bold ? "b" : "r"] ||= await src.embedFont(bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica));
    const touched = new Set();
    for (const it of items) {
      const page = src.getPage(it.page - 1);
      const { width: w, height: h } = page.getSize();
      const turn = turnOf(page);
      const vw = turn % 180 === 0 ? w : h;
      const vh = turn % 180 === 0 ? h : w;
      // A point on the page as seen (x from the left, y from the bottom) in the page's own axes.
      const own = (vx, vy) => ({ 0: [vx, vy], 90: [w - vy, vx], 180: [w - vx, h - vy], 270: [vy, h - vx] }[turn]);
      const color = rgb(it.color[0], it.color[1], it.color[2]);
      if (it.kind === "text") {
        const font = await fontFor(it.bold);
        const known = new Set(font.getCharacterSet());
        const lines = String(it.text).replace(/\r\n?/g, "\n").split("\n");
        const bad = [...lines.join("")].find((ch) => !known.has(ch.codePointAt(0)));
        if (bad) throw new Error(`The text has a character this font cannot write: “${bad}”. Use Latin letters, digits and common punctuation.`);
        const lineHeight = it.size * 1.2;
        const blockWidth = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, it.size)));
        const left = (it.x / 100) * vw - blockWidth / 2;
        const top = (1 - it.y / 100) * vh + (lines.length * lineHeight) / 2;
        lines.forEach((line, i) => {
          if (line === "") return;
          const [x, y] = own(left, top - i * lineHeight - it.size * 0.95);
          page.drawText(line, { x, y, size: it.size, font, color, rotate: degrees(turn) });
        });
      } else if (it.kind === "rect") {
        const wi = (it.width / 100) * vw;
        const hi = (it.height / 100) * vh;
        const [x, y] = own((it.x / 100) * vw - wi / 2, (1 - it.y / 100) * vh - hi / 2);
        if (it.fill) page.drawRectangle({ x, y, width: wi, height: hi, rotate: degrees(turn), color, opacity: it.opacity, blendMode: BlendMode.Multiply });
        else page.drawRectangle({ x, y, width: wi, height: hi, rotate: degrees(turn), borderColor: color, borderWidth: it.line || 1.5, borderOpacity: it.opacity });
      } else if (it.kind === "path") {
        const points = (it.points || []).map(([px, py]) => own((px / 100) * vw, (1 - py / 100) * vh));
        if (points.length === 1) points.push(points[0]);
        for (let i = 1; i < points.length; i++) {
          page.drawLine({ start: { x: points[i - 1][0], y: points[i - 1][1] }, end: { x: points[i][0], y: points[i][1] }, thickness: it.line || 2, color, opacity: it.opacity, lineCap: LineCapStyle.Round });
        }
      } else {
        continue;
      }
      touched.add(it.page);
    }
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, drawn: items.length, touched: touched.size }, [bytes.buffer]);
  },

  /**
   * m.options: { pages: [1-based pages to number], position: "tl".."br", format: "n" | "page-n" | "n-of-m" | "page-n-of-m",
   * start: number on the first numbered page, size: points, margin: points }. The number counts up over the numbered
   * pages only, so skipping the cover starts the count on page 2.
   * With m.options.bates: { prefix, suffix, digits } each page gets an identifier instead: the prefix, the number padded
   * with zeros to `digits`, then the suffix (ABC000123), and `format` is not used. A character Helvetica cannot write is
   * refused, never swapped for another: a wrong identifier is worse than none.
   * The answer carries the first and last text written, so the page reports what the file really holds.
   */
  async numbers(src, m, total) {
    const o = m.options;
    const pages = chosenPages(o.pages, total);
    if (!pages.length) throw new Error("No pages were selected.");
    const font = await src.embedFont(StandardFonts.Helvetica);
    const last = o.start + pages.length - 1;
    const bates = o.bates ? { prefix: String(o.bates.prefix || ""), suffix: String(o.bates.suffix || ""), digits: Math.min(12, Math.max(1, Math.floor(o.bates.digits) || 1)) } : null;
    if (bates) {
      const known = new Set(font.getCharacterSet());
      const bad = [...(bates.prefix + bates.suffix)].find((ch) => !known.has(ch.codePointAt(0)));
      if (bad) throw new Error(`The prefix or suffix has a character this font cannot write: “${bad}”. Use Latin letters, digits and common punctuation.`);
    }
    const labelOf = (value) => bates
      ? `${bates.prefix}${String(value).padStart(bates.digits, "0")}${bates.suffix}`
      : { n: `${value}`, "page-n": `Page ${value}`, "n-of-m": `${value} of ${last}`, "page-n-of-m": `Page ${value} of ${last}` }[o.format] || `${value}`;
    pages.forEach((n, i) => {
      const label = labelOf(o.start + i);
      const page = src.getPage(n - 1);
      const { width: w, height: h } = page.getSize();
      const turn = ((page.getRotation().angle % 360) + 360) % 360;
      // Work on the page as it is seen (turned pages are wider than tall), then map back to the page's own axes.
      const vw = turn % 180 === 0 ? w : h;
      const vh = turn % 180 === 0 ? h : w;
      const width = font.widthOfTextAtSize(label, o.size);
      const column = o.position[1];
      const row = o.position[0];
      const vx = column === "l" ? o.margin : column === "c" ? (vw - width) / 2 : vw - o.margin - width;
      const vy = row === "b" ? o.margin : row === "m" ? (vh - o.size * 0.72) / 2 : vh - o.margin - o.size * 0.72;
      const at = { 0: [vx, vy], 90: [w - vy, vx], 180: [w - vx, h - vy], 270: [vy, h - vx] }[turn];
      page.drawText(label, { x: at[0], y: at[1], size: o.size, font, color: rgb(0.2, 0.2, 0.2), rotate: degrees(turn) });
    });
    src.setProducer("pdf.do");
    const bytes = await src.save(OPTIONS);
    self.postMessage({ done: true, bytes, pages: total, total, numbered: pages.length, firstLabel: labelOf(o.start), lastLabel: labelOf(last) }, [bytes.buffer]);
  },
};

self.onmessage = async (event) => {
  const m = event.data;
  try {
    const run = operations[m.op];
    if (!run) throw new Error("Unknown operation: " + m.op);
    const src = await PDFDocument.load(m.buffer, { ignoreEncryption: true, updateMetadata: false });
    if (src.isEncrypted) throw new Error("This PDF is encrypted. If it needs a password to open, use Remove PDF password first. If it opens but forbids changes, use Unlock PDF first.");
    await run(src, m, src.getPageCount());
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
