// A phone-scan-style fixture: pages whose images are ALREADY JPEG. Generated with
// a real browser canvas (Chromium's JPEG encoder) because Node has no JPEG encoder.
import fs from "node:fs";
import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts } from "@cantoo/pdf-lib";

fs.mkdirSync("fixtures", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const jpegs = [];
for (let i = 1; i <= 3; i++) {
  const b64 = await page.evaluate(async (seed) => {
    const c = document.createElement("canvas");
    c.width = 1700; c.height = 2200; // ~200 dpi letter scan
    const g = c.getContext("2d");
    g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, c.width, c.height);
    let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const img = g.getImageData(0, 0, c.width, c.height);
    for (let p = 0; p < img.data.length; p += 4) { const n = (rnd() - 0.5) * 38; img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n; }
    g.putImageData(img, 0, 0);
    g.fillStyle = "#222"; g.font = "44px serif";
    for (let l = 0; l < 38; l++) g.fillText(`Scanned line ${l + 1}: the quick brown fox jumps over the lazy dog.`, 120, 160 + l * 52);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let k = 0; k < buf.length; k += 8192) bin += String.fromCharCode(...buf.subarray(k, k + 8192));
    return btoa(bin);
  }, 7000 + i);
  jpegs.push(Buffer.from(b64, "base64"));
}
await browser.close();

const doc = await PDFDocument.create();
await doc.embedFont(StandardFonts.Helvetica);
for (const j of jpegs) {
  const img = await doc.embedJpg(j);
  const pg = doc.addPage([612, 792]);
  pg.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
}
fs.writeFileSync("fixtures/scan-jpeg.pdf", await doc.save());
console.log(`fixture scan-jpeg.pdf      ${(fs.statSync("fixtures/scan-jpeg.pdf").size / 1024).toFixed(0)} KB (${jpegs.map((j) => (j.length / 1024).toFixed(0) + " KB").join(", ")} JPEG pages)`);
