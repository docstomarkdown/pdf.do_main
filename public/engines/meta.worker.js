/* Metadata engine: read and write the document information of a PDF (title, author and so on).
   Classic worker with a self-hosted pdf-lib. Empty text removes a field instead of storing an empty one.
   An XMP metadata block, if the file has one, is reported but never changed. */
importScripts("/engines/vendor/pdf-lib.min.js");
const { PDFDocument, PDFName } = PDFLib;

const FIELDS = [
  ["title", "Title", "setTitle"],
  ["author", "Author", "setAuthor"],
  ["subject", "Subject", "setSubject"],
  ["keywords", "Keywords", "setKeywords"],
  ["creator", "Creator", "setCreator"],
  ["producer", "Producer", "setProducer"],
];

const when = (date) => (date ? date.toISOString() : "");

self.onmessage = async (event) => {
  const m = event.data;
  try {
    const doc = await PDFDocument.load(m.buffer, { ignoreEncryption: true, updateMetadata: false });
    if (doc.isEncrypted) throw new Error("This PDF is encrypted. If it needs a password to open, use Remove PDF password first. If it opens but forbids changes, use Unlock PDF first.");
    const hasXmp = doc.catalog.has(PDFName.of("Metadata"));

    if (m.op === "read") {
      self.postMessage({
        done: true,
        fields: {
          title: doc.getTitle() || "",
          author: doc.getAuthor() || "",
          subject: doc.getSubject() || "",
          keywords: doc.getKeywords() || "",
          creator: doc.getCreator() || "",
          producer: doc.getProducer() || "",
        },
        created: when(doc.getCreationDate()),
        modified: when(doc.getModificationDate()),
        hasXmp,
        pages: doc.getPageCount(),
      });
      return;
    }

    if (m.op !== "write") throw new Error("Unknown operation: " + m.op);
    const infoRef = doc.context.trailerInfo.Info;
    const info = infoRef ? doc.context.lookup(infoRef) : undefined;
    for (const [key, name, setter] of FIELDS) {
      const value = String(m.fields[key] ?? "").trim();
      if (value === "") {
        if (info && info.delete) info.delete(PDFName.of(name));
      } else if (setter === "setKeywords") {
        doc.setKeywords([value]);
      } else {
        doc[setter](value);
      }
    }
    const bytes = await doc.save({ useObjectStreams: true });
    self.postMessage({ done: true, bytes, hasXmp }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
