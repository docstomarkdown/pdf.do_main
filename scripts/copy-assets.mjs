// Copies the engines out of node_modules into public/engines/vendor so they are
// served from our own origin (no third-party CDN; see foundations.md section 3).
import fs from "node:fs";

const out = "public/engines/vendor";
fs.mkdirSync(out, { recursive: true });
const files = [
  ["node_modules/@cantoo/pdf-lib/dist/pdf-lib.min.js", "pdf-lib.min.js"],
  ["node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.js", "qpdf.js"],
  ["node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm", "qpdf.wasm"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
];
for (const [from, to] of files) {
  fs.copyFileSync(from, `${out}/${to}`);
  console.log(`engine  ${to.padEnd(22)} ${(fs.statSync(`${out}/${to}`).size / 1024).toFixed(0)} KB`);
}
