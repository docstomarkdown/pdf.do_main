// Deterministic test PDFs: two text-only files and one image-heavy file whose
// images are Flate-compressed PNGs (large, and recompressible as JPEG).
import fs from "node:fs";
import zlib from "node:zlib";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

fs.mkdirSync("fixtures", { recursive: true });

async function textPdf(name, pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${name} — page ${i} of ${pages}`, { x: 60, y: 760, size: 22, font, color: rgb(0.1, 0.1, 0.2) });
    for (let l = 0; l < 30; l++) page.drawText(`Line ${l + 1}: the quick brown fox jumps over the lazy dog.`, { x: 60, y: 700 - l * 18, size: 11, font });
  }
  fs.writeFileSync(`fixtures/${name}.pdf`, await doc.save());
}

function crcChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function png(w, h, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const n = () => (rnd() - 0.5) * 24;
      raw[o] = Math.max(0, Math.min(255, (x / w) * 255 + n()));
      raw[o + 1] = Math.max(0, Math.min(255, (y / h) * 255 + n()));
      raw[o + 2] = Math.max(0, Math.min(255, 128 + 100 * Math.sin((x + y) / 90) + n()));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    crcChunk("IHDR", ihdr),
    crcChunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    crcChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function imagePdf(name, pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 1; i <= pages; i++) {
    const img = await doc.embedPng(png(1200, 900, 1000 + i));
    const page = doc.addPage([595, 842]);
    page.drawText(`Scan ${i}`, { x: 60, y: 790, size: 28, font });
    page.drawImage(img, { x: 40, y: 140, width: 515, height: 386 });
    page.drawImage(img, { x: 40, y: 540, width: 515, height: 200 });
  }
  fs.writeFileSync(`fixtures/${name}.pdf`, await doc.save());
}

await textPdf("text-2p", 2);
await textPdf("text-3p", 3);
await imagePdf("image-heavy", 3);
for (const f of fs.readdirSync("fixtures")) console.log(`fixture ${f.padEnd(18)} ${(fs.statSync(`fixtures/${f}`).size / 1024).toFixed(0)} KB`);
