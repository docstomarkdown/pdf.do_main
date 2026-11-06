// Debug aid: writes the first JPEG image in a PDF to a file so output quality can be inspected.
import fs from "node:fs";
import { PDFDocument, PDFName, PDFRawStream } from "@cantoo/pdf-lib";
const [input, output] = process.argv.slice(2);
const doc = await PDFDocument.load(fs.readFileSync(input));
for (const [, obj] of doc.context.enumerateIndirectObjects()) {
  if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype"))?.toString() === "/Image") {
    fs.writeFileSync(output, obj.contents);
    console.log(`wrote ${output} (${obj.contents.length} bytes, ${obj.dict.get(PDFName.of("Width"))}x${obj.dict.get(PDFName.of("Height"))})`);
    break;
  }
}
