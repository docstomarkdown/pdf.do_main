/* Security engine: add a password to a PDF, take it off, or lift restrictions, with qpdf (WASM).
   Classic worker; qpdf.js defines a global `Module`. The password is used here and nowhere else: it is not stored,
   logged or sent, and the worker is stopped when the job ends.
   Operations:
   - probe:   { buffer } -> { isEncrypted, checkCode }  isEncrypted is true when the file is encrypted but opens without a password
   - encrypt: { buffer, password } -> { bytes }          AES-256, one password for opening and for everything else
   - decrypt: { buffer, password? } -> { bytes }         a copy with no encryption at all
   - repair:  { buffer } -> { bytes, pages, mended }     the file written out again with a fresh index; mended is true when qpdf could not read the original */
// qpdf reports every problem on its error output, which a browser shows as a console error ("invalid password"). The page
// says what went wrong in its own words, so qpdf's lines about the file it was given are dropped here. Anything else passes.
for (const level of ["error", "warn"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => { if (!/\/in\.pdf/.test(String(args[0]))) original(...args); };
}

importScripts("/engines/vendor/pdf-lib.min.js", "/engines/vendor/qpdf.js");

// qpdf's exit codes: 0 ok, 3 ok with warnings, 2 error (including a file it cannot open without a password).
async function run(buffer, args, wantOutput) {
  const qpdf = await Module({ locateFile: () => "/engines/vendor/qpdf.wasm", print: () => {}, printErr: () => {} });
  qpdf.FS.writeFile("/in.pdf", new Uint8Array(buffer));
  let code;
  try {
    code = qpdf.callMain(args);
  } catch (err) {
    code = err && typeof err.status === "number" ? err.status : 2;
  }
  let bytes = null;
  if (wantOutput && (code === 0 || code === 3)) {
    try { bytes = qpdf.FS.readFile("/out.pdf"); } catch (err) { bytes = null; }
  }
  return { code, bytes };
}

self.onmessage = async (event) => {
  const m = event.data;
  try {
    if (m.op === "probe") {
      const encrypted = await run(m.buffer, ["--is-encrypted", "/in.pdf"], false);
      const check = await run(m.buffer, ["--check", "/in.pdf"], false);
      self.postMessage({ done: true, isEncrypted: encrypted.code === 0, checkCode: check.code });
    } else if (m.op === "encrypt") {
      // A password that is exactly "--" would end qpdf's list of encryption settings early.
      if (!m.password || m.password === "--") throw new Error("Please choose a different password.");
      const r = await run(m.buffer, ["/in.pdf", "--encrypt", m.password, m.password, "256", "--", "/out.pdf"], true);
      if (!r.bytes) throw new Error("The password could not be added to this file.");
      self.postMessage({ done: true, bytes: r.bytes }, [r.bytes.buffer]);
    } else if (m.op === "decrypt") {
      const args = m.password ? ["--password=" + m.password, "--decrypt", "/in.pdf", "/out.pdf"] : ["--decrypt", "/in.pdf", "/out.pdf"];
      const r = await run(m.buffer, args, true);
      if (!r.bytes) throw new Error(m.password ? "That password did not open the file." : "This file could not be unlocked.");
      self.postMessage({ done: true, bytes: r.bytes }, [r.bytes.buffer]);
    } else if (m.op === "repair") {
      // qpdf is asked whether it can read the file as it is: if it cannot, the file has a structural fault. pdf-lib then reads the
      // file object by object, without trusting its index, and writes it out again with a fresh one.
      const check = await run(m.buffer, ["--check", "/in.pdf"], false);
      let doc;
      try {
        doc = await PDFLib.PDFDocument.load(m.buffer, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
      } catch (err) {
        throw new Error("This file is too damaged to repair here.");
      }
      if (doc.isEncrypted) throw new Error("This PDF is encrypted. If it needs a password to open, use Remove PDF password first. If it opens but forbids changes, use Unlock PDF first.");
      const pages = doc.getPageCount();
      if (pages === 0) throw new Error("This file is too damaged to repair here.");
      const bytes = await doc.save({ useObjectStreams: true });
      self.postMessage({ done: true, bytes, pages, mended: !(check.code === 0 || check.code === 3) }, [bytes.buffer]);
    } else {
      throw new Error("Unknown operation: " + m.op);
    }
  } catch (err) {
    self.postMessage({ error: (err && err.message) || String(err) });
  }
};
