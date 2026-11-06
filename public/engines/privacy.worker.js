/* Privacy scan: looks for the common places a PDF carries more than its pages show. Classic worker with a self-hosted pdf-lib.
   It reports what it finds and never changes the file. A clear result means these checks found nothing, not that the file is clean.
   Post: { done, findings: [{ id, tone: "ok" | "warn" | "bad", title, detail }] } */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument, PDFName, PDFDict, PDFStream } = PDFLib;

const text = (value) => (value && value.decodeText ? value.decodeText() : value && value.asString ? value.asString() : "");

/** True when a JPEG's first bytes hold an EXIF block with a GPS entry (tag 0x8825). */
function hasGps(bytes) {
  let i = 2;
  while (i + 4 < bytes.length && bytes[0] === 0xff && bytes[1] === 0xd8) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 && bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66) {
      const t = i + 10;
      const little = bytes[t] === 0x49;
      const u16 = (o) => (little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
      const u32 = (o) => (little ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0 : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      if (ifd + 2 > bytes.length) return false;
      for (let k = 0; k < u16(ifd); k++) { const e = ifd + 2 + k * 12; if (e + 12 > bytes.length) return false; if (u16(e) === 0x8825) return true; }
      return false;
    }
    if (marker === 0xda) return false;
    i += 2 + length;
  }
  return false;
}

/** A script in a dict, or in a dict written inside it (an action nested in /OpenAction or /AA is not a separate object). */
function hasScript(dict, depth) {
  if (dict.has(PDFName.of("JS")) || dict.get(PDFName.of("S")) === PDFName.of("JavaScript")) return true;
  if (depth === 0) return false;
  for (const [, value] of dict.entries()) if (value instanceof PDFDict && hasScript(value, depth - 1)) return true;
  return false;
}

/** Web addresses in a dict or in dicts written inside it (a link's action sits inside the link). */
function collectUris(dict, depth, into) {
  if (dict.get(PDFName.of("S")) === PDFName.of("URI")) { const uri = dict.get(PDFName.of("URI")); if (uri) into.add(text(uri)); }
  if (depth === 0) return;
  for (const [, value] of dict.entries()) if (value instanceof PDFDict) collectUris(value, depth - 1, into);
}

self.onmessage = async (event) => {
  const m = event.data;
  try {
    const doc = await PDFDocument.load(m.buffer, { ignoreEncryption: true, updateMetadata: false });
    if (doc.isEncrypted) throw new Error("This PDF is encrypted. If it needs a password to open, use Remove PDF password first. If it opens but forbids changes, use Unlock PDF first.");
    const findings = [];
    const add = (id, tone, title, detail) => findings.push({ id, tone, title, detail });
    const info = [["Title", doc.getTitle()], ["Author", doc.getAuthor()], ["Subject", doc.getSubject()], ["Keywords", doc.getKeywords()], ["Creator", doc.getCreator()], ["Producer", doc.getProducer()]].filter(([, v]) => v);
    const person = info.filter(([k]) => k === "Author" || k === "Creator");
    add("info", person.length ? "warn" : info.length ? "warn" : "ok", "Document information", info.length ? info.map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`).join(" · ") : "No title, author or other details are stored.");
    add("xmp", doc.catalog.has(PDFName.of("Metadata")) ? "warn" : "ok", "XMP metadata block", doc.catalog.has(PDFName.of("Metadata")) ? "The file carries a second set of details that some programs show. Edit PDF metadata does not change it." : "None.");

    let scripts = 0, embedded = 0, annotations = 0, filled = 0, gps = 0;
    const links = new Set();
    const kinds = new Set();
    for (const [, object] of doc.context.enumerateIndirectObjects()) {
      if (object instanceof PDFStream) {
        const type = object.dict.get(PDFName.of("Type"));
        if (type === PDFName.of("EmbeddedFile")) embedded++;
        if (object.dict.get(PDFName.of("Subtype")) === PDFName.of("Image") && object.dict.get(PDFName.of("Filter")) === PDFName.of("DCTDecode")) {
          if (hasGps(object.getContents ? object.getContents() : new Uint8Array())) gps++;
        }
        continue;
      }
      if (!(object instanceof PDFDict)) continue;
      if (hasScript(object, 3)) scripts++;
      const subtype = object.get(PDFName.of("Subtype"));
      if (object.has(PDFName.of("Rect")) && subtype && subtype !== PDFName.of("Link") && subtype !== PDFName.of("Widget")) {
        annotations++;
        kinds.add(String(subtype).replace("/", ""));
      }
      collectUris(object, 3, links);
      if (object.get(PDFName.of("FT")) === PDFName.of("Tx") && object.has(PDFName.of("V"))) filled++;
    }
    add("gps", gps ? "bad" : "ok", "Location in pictures", gps ? `${gps} ${gps === 1 ? "picture holds" : "pictures hold"} a GPS location in ${gps === 1 ? "its" : "their"} photo details.` : "No picture carries a GPS location.");
    add("embedded", embedded ? "warn" : "ok", "Attached files", embedded ? `${embedded} ${embedded === 1 ? "file is" : "files are"} attached inside the PDF.` : "None.");
    add("scripts", scripts ? "warn" : "ok", "JavaScript", scripts ? "The file contains scripts that can run when it opens." : "None.");
    add("annotations", annotations ? "warn" : "ok", "Comments and markup", annotations ? `${annotations} ${annotations === 1 ? "item" : "items"} (${[...kinds].join(", ")}), which can name who wrote them.` : "None.");
    add("fields", filled ? "warn" : "ok", "Filled form fields", filled ? `${filled} ${filled === 1 ? "text field has" : "text fields have"} an entry.` : "None.");
    add("links", links.size ? "warn" : "ok", "Links to web addresses", links.size ? [...links].slice(0, 4).join(" · ") + (links.size > 4 ? ` · and ${links.size - 4} more` : "") : "None.");
    add("layers", doc.catalog.has(PDFName.of("OCProperties")) ? "warn" : "ok", "Layers", doc.catalog.has(PDFName.of("OCProperties")) ? "The file has layers. A hidden layer can still hold content." : "None.");
    let eof = 0;
    const bytes = new Uint8Array(m.buffer);
    const marker = [0x25, 0x25, 0x45, 0x4f, 0x46];
    for (let i = 0; i + 5 <= bytes.length; i++) if (bytes[i] === marker[0] && bytes[i + 1] === marker[1] && bytes[i + 2] === marker[2] && bytes[i + 3] === marker[3] && bytes[i + 4] === marker[4]) eof++;
    add("versions", eof > 1 ? "warn" : "ok", "Earlier versions", eof > 1 ? `The file was saved as ${eof} layers of changes, so text that was removed or changed may still be inside it.` : "The file looks like a single save.");
    self.postMessage({ done: true, findings });
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
