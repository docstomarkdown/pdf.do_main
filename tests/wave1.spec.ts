import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import { unzipSync } from "fflate";
import { audit, download, fixture, pageCount, pageText, watchErrors, watchOutbound } from "./helpers";

// Wave 1 tools: split, rotate, page numbers, metadata, images to PDF, PDF to JPG and PNG, extract text.
// Every output is read back (page counts, rotation, text, sizes, picture bytes); every test also asserts that the
// browser made no request outside its own origin and logged no console error.

const read = (file: string) => new Uint8Array(fs.readFileSync(file));

/** Width and height of a JPEG (from its start-of-frame marker) or a PNG (from its header). */
function pictureSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] === 0x89) return { width: new DataView(bytes.buffer, bytes.byteOffset).getUint32(16), height: new DataView(bytes.buffer, bytes.byteOffset).getUint32(20) };
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc2) return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  throw new Error("not a picture");
}

/** A picture drawn in the browser, so the tests carry no binary files. */
async function makePicture(page: Page, width: number, height: number, type: "image/png" | "image/jpeg" | "image/webp"): Promise<Buffer> {
  const data = await page.evaluate(([w, h, t]) => {
    const canvas = document.createElement("canvas");
    canvas.width = w as number;
    canvas.height = h as number;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, w as number, h as number);
    gradient.addColorStop(0, "rgb(200,40,40)");
    gradient.addColorStop(1, "rgb(40,40,200)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w as number, h as number);
    return canvas.toDataURL(t as string, 0.92);
  }, [width, height, type]);
  return Buffer.from(data.split(",")[1], "base64");
}

/** The same JPEG with an EXIF note saying "turn it a quarter clockwise to show it" (orientation 6), as phones write. */
function withOrientation6(jpeg: Buffer): Buffer {
  const tiff = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0]);
  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const segment = Buffer.concat([Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);
  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

test("split: every page, then ranges, with the files and the ZIP read back", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/split-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("button", { name: "Split into 3 files" })).toBeEnabled();
  await audit(page, "split, every page");
  await page.getByRole("button", { name: "Split into 3 files" }).click();
  await expect(page.getByTestId("split-count")).toHaveText("3 files");
  await expect(page.getByRole("listitem").filter({ hasText: "text-3p-page-2.pdf" })).toContainText("1 page, page 2");

  const zipPath = await download(page, /^Download all \(ZIP, [\d.]+\sKB\)$/);
  const files = unzipSync(read(zipPath));
  expect(Object.keys(files).sort()).toEqual(["text-3p-page-1.pdf", "text-3p-page-2.pdf", "text-3p-page-3.pdf"]);
  for (const [name, bytes] of Object.entries(files)) {
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount(), name).toBe(1);
  }
  await audit(page, "split result");

  // Ranges: each comma is one file, in the order typed.
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("radio", { name: /Ranges/ }).check({ force: true });
  const field = page.getByLabel("Pages for each file");
  await field.fill("3, 1-2");
  await expect(page.getByRole("button", { name: "Split into 2 files" })).toBeEnabled();
  await field.fill("1-9");
  await expect(page.getByText("Pages go from 1 to 3.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Split PDF" })).toBeDisabled();
  await field.fill("3, 1-2");
  await page.getByRole("button", { name: "Split into 2 files" }).click();
  await expect(page.getByTestId("split-count")).toHaveText("2 files");
  const second = unzipSync(read(await download(page, /^Download all/)));
  expect(Object.keys(second)).toEqual(["text-3p-page-3.pdf", "text-3p-pages-1-2.pdf"]);
  expect((await PDFDocument.load(second["text-3p-pages-1-2.pdf"])).getPageCount()).toBe(2);
  noProblems(outside, errors);
});

test("split: equal parts, and a size that is not a whole number is explained", async ({ page }) => {
  await page.goto("/split-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await page.getByRole("radio", { name: /Equal parts/ }).check({ force: true });
  const size = page.getByLabel("Pages in each file");
  await size.fill("2");
  await expect(page.getByRole("button", { name: "Split into 2 files" })).toBeEnabled(); // 2 pages, then 1 left over
  await size.fill("two");
  await expect(page.getByText("Type a whole number of pages, such as 2.")).toBeVisible();
  await size.fill("2");
  await page.getByRole("button", { name: "Split into 2 files" }).click();
  const files = unzipSync(read(await download(page, /^Download all/)));
  expect(Object.keys(files).sort()).toEqual(["text-3p-pages-1-2.pdf", "text-3p-page-3.pdf"].sort());
});

test("rotate: pick a page and turn it, or turn every page, and read the rotation back", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  const p2 = page.getByRole("checkbox", { name: "Page 2" });
  await expect(p2.locator("img")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Save rotated PDF" })).toBeDisabled();

  await p2.click();
  await page.getByRole("button", { name: "Turn right" }).click();
  await expect(p2.locator("img")).toHaveAttribute("style", /rotate\(90deg\)/); // the thumbnail turns before anything is saved
  await expect(page.getByText("1 of 3 pages turned")).toBeVisible();
  await audit(page, "rotate, one page turned");
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  await expect(page.getByTestId("turned-count")).toHaveText("1 page turned");
  const out = await download(page, "Download rotated PDF");
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect([0, 1, 2].map((i) => doc.getPage(i).getRotation().angle)).toEqual([0, 90, 0]);
  expect(await pageText(out, 2)).toContain("page 2 of 3"); // the content is untouched

  // Start over, select nothing, and a turn applies to every page; turning left from 0 is 270.
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Turn left" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const all = await PDFDocument.load(fs.readFileSync(await download(page, "Download rotated PDF")));
  expect([0, 1, 2].map((i) => all.getPage(i).getRotation().angle)).toEqual([270, 270, 270]);
  noProblems(outside, errors);
});

test("page numbers: the preview shows the number, the saved PDF carries it, and the cover can be skipped", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/page-numbers");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  const mark = page.getByTestId("number-mark");
  await expect(mark).toHaveText("1");
  await page.getByLabel("Style").selectOption("page-n-of-m");
  await expect(mark).toHaveText("Page 1 of 3");
  await page.getByLabel("Start at").fill("x");
  await expect(page.getByText("Type a whole number, such as 1.")).toBeVisible();
  await page.getByLabel("Start at").fill("1");
  await page.getByRole("radio", { name: "Top right" }).check({ force: true });
  const placed = await mark.evaluate((el) => ({ right: (el as HTMLElement).style.right, top: (el as HTMLElement).style.top }));
  expect(placed.right).not.toBe("");
  expect(placed.top).not.toBe("");
  await audit(page, "page numbers, preview");

  await page.getByRole("button", { name: "Number 3 pages" }).click();
  await expect(page.getByTestId("numbered-count")).toHaveText("3 pages numbered");
  const out = await download(page, "Download numbered PDF");
  for (const n of [1, 2, 3]) expect(await pageText(out, n)).toContain(`Page ${n} of 3`); // capital P: the added number, not the page's own text

  // Skip the cover: page 1 gets nothing, page 2 is "1 of 2".
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByLabel("Style").selectOption("page-n-of-m");
  await page.getByRole("checkbox", { name: /Skip the first page/ }).check();
  await expect(page.getByText("Page 1 is not numbered.")).toBeVisible();
  await page.getByRole("button", { name: "Number 2 pages" }).click();
  const skipped = await download(page, "Download numbered PDF");
  expect(await pageText(skipped, 1)).not.toContain("Page 1 of");
  expect(await pageText(skipped, 2)).toContain("Page 1 of 2");
  expect(await pageText(skipped, 3)).toContain("Page 2 of 2");
  noProblems(outside, errors);
});

test("page numbers: a page that is already turned still gets its number", async ({ page }) => {
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();
  await page.getByRole("button", { name: "Turn right" }).click(); // every page
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const saved = await download(page, "Download rotated PDF");
  const turned = `test-results/turned-${test.info().project.name}.pdf`; // a download has no .pdf name, which the file chooser needs
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(saved, turned);
  await page.goto("/page-numbers");
  await page.setInputFiles('input[type="file"]', turned);
  await page.getByLabel("Style").selectOption("page-n-of-m");
  await page.getByRole("button", { name: "Number 2 pages" }).click();
  const out = await download(page, "Download numbered PDF");
  expect(await pageText(out, 1)).toContain("Page 1 of 2");
  expect(await pageText(out, 2)).toContain("Page 2 of 2");
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect(doc.getPage(0).getRotation().angle).toBe(90); // the turn is kept
});

test("metadata: read, edit, save, and clear", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/edit-pdf-metadata");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByLabel("Converted with")).toHaveValue(/pdf-lib/); // read from the file
  await page.getByLabel("Title").fill("Quarterly report");
  await page.getByLabel("Author").fill("A. Writer");
  await page.getByLabel("Keywords").fill("finance, 2025");
  await audit(page, "metadata, edited");
  await page.getByRole("button", { name: "Save changes" }).click();
  const doc = await PDFDocument.load(fs.readFileSync(await download(page, "Download edited PDF")));
  expect(doc.getTitle()).toBe("Quarterly report");
  expect(doc.getAuthor()).toBe("A. Writer");
  expect(doc.getKeywords()).toBe("finance, 2025");
  expect(doc.getPageCount()).toBe(2);

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Clear all fields" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("all fields cleared")).toBeVisible();
  // pdf-lib stamps its own name as Producer on load unless told not to, so the check reads the file as it is.
  const cleared = await PDFDocument.load(fs.readFileSync(await download(page, "Download edited PDF")), { updateMetadata: false });
  expect(cleared.getTitle()).toBeUndefined();
  expect(cleared.getAuthor()).toBeUndefined();
  expect(cleared.getProducer()).toBeUndefined();
  noProblems(outside, errors);
});

test("images to PDF: order, page size, JPEG kept byte for byte, an upright phone photo, and an unreadable file", async ({ page, context, baseURL, browserName }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/images-to-pdf");
  const png = await makePicture(page, 300, 200, "image/png");
  const jpeg = await makePicture(page, 200, 300, "image/jpeg");
  const files = [
    { name: "wide.png", mimeType: "image/png", buffer: png },
    { name: "tall.jpg", mimeType: "image/jpeg", buffer: jpeg },
    { name: "notes.png", mimeType: "image/png", buffer: Buffer.from("this is not a picture") },
  ];
  await page.setInputFiles('input[type="file"]', files);
  await expect(page.getByText("This file could not be read as an image.")).toBeVisible();
  await expect(page.getByText("300 × 200")).toBeVisible();
  await page.getByRole("button", { name: "Remove notes.png" }).click();
  await expect(page.getByRole("button", { name: "Make a PDF of 2 images" })).toBeEnabled();
  await audit(page, "images to PDF, two pictures");

  // A4 and Auto: the wide picture makes a landscape page, the tall one a portrait page, and neither is enlarged.
  await page.getByRole("button", { name: "Make a PDF of 2 images" }).click();
  await expect(page.getByTestId("images-pages")).toHaveText("2 pages");
  const a4 = fs.readFileSync(await download(page, "Download PDF"));
  const doc = await PDFDocument.load(a4);
  expect(doc.getPage(0).getSize().width).toBeCloseTo(841.89, 1);
  expect(doc.getPage(1).getSize().width).toBeCloseTo(595.28, 1);
  expect(Buffer.from(a4).includes(jpeg)).toBe(true); // the JPEG went in exactly as it was: never recompressed

  // Move the tall picture first, choose Fit image and no margin: each page is its picture at 96 pixels to the inch.
  await page.getByRole("button", { name: "Start over" }).click();
  await page.setInputFiles('input[type="file"]', files.slice(0, 2));
  await page.getByRole("button", { name: "Move tall.jpg up" }).click();
  await page.getByRole("radio", { name: "Fit image" }).check({ force: true });
  await page.getByRole("radio", { name: "None" }).check({ force: true });
  await page.getByRole("button", { name: "Make a PDF of 2 images" }).click();
  const fit = await PDFDocument.load(fs.readFileSync(await download(page, "Download PDF")));
  expect(fit.getPage(0).getSize()).toEqual({ width: 150, height: 225 }); // 200 x 300 px
  expect(fit.getPage(1).getSize()).toEqual({ width: 225, height: 150 }); // 300 x 200 px

  // A phone photo stored sideways (EXIF orientation 6) is put upright: a 300 x 200 file shows as 200 x 300.
  await page.getByRole("button", { name: "Start over" }).click();
  await page.setInputFiles('input[type="file"]', [{ name: "phone.jpg", mimeType: "image/jpeg", buffer: withOrientation6(await makePicture(page, 300, 200, "image/jpeg")) }]);
  await page.getByRole("radio", { name: "Fit image" }).check({ force: true });
  await page.getByRole("radio", { name: "None" }).check({ force: true });
  await page.getByRole("button", { name: "Make a PDF of 1 image" }).click();
  const upright = await PDFDocument.load(fs.readFileSync(await download(page, "Download PDF")));
  expect(upright.getPage(0).getSize()).toEqual({ width: 150, height: 225 });

  // Another format is converted: WebP where the browser can make one.
  if (browserName === "chromium") {
    await page.getByRole("button", { name: "Start over" }).click();
    await page.setInputFiles('input[type="file"]', [{ name: "web.webp", mimeType: "image/webp", buffer: await makePicture(page, 120, 80, "image/webp") }]);
    await page.getByRole("button", { name: "Make a PDF of 1 image" }).click();
    expect(await pageCount(await download(page, "Download PDF"))).toBe(1);
  }
  noProblems(outside, errors);
});

test("PDF to JPG: pages and resolution chosen, pictures and ZIP read back at the right size", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/pdf-to-jpg");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" }).locator("img")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Convert 3 pages to JPG" })).toBeEnabled(); // every page, with nothing chosen
  await page.getByRole("radio", { name: /Small/ }).check({ force: true });
  await page.getByLabel("Pages to convert").fill("2-3");
  await expect(page.getByRole("button", { name: "Convert 2 pages to JPG" })).toBeEnabled();
  await audit(page, "PDF to JPG, pages chosen");
  await page.getByRole("button", { name: "Convert 2 pages to JPG" }).click();
  await expect(page.getByTestId("image-count")).toHaveText("2 pictures");

  const zipPath = await download(page, /^Download all \(ZIP/);
  const files = unzipSync(read(zipPath));
  expect(Object.keys(files).sort()).toEqual(["text-3p-page-2.jpg", "text-3p-page-3.jpg"]);
  for (const bytes of Object.values(files)) {
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff]);
    expect(pictureSize(bytes)).toEqual({ width: 595, height: 842 }); // A4 in points, at 72 dpi
  }
  await audit(page, "PDF to JPG, result");
  noProblems(outside, errors);
});

test("PDF to PNG: a real PNG at 150 dpi, and an oversized page is drawn smaller and says so", async ({ page }) => {
  await page.goto("/pdf-to-png");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();
  await page.getByLabel("Pages to convert").fill("1");
  await page.getByRole("button", { name: "Convert 1 page to PNG" }).click();
  await expect(page.getByTestId("image-count")).toHaveText("1 picture");
  const png = read(await download(page, "Download Page 1"));
  expect(Array.from(png.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(pictureSize(png)).toEqual({ width: 1240, height: 1755 }); // A4 at 150 dpi, the height rounded up to a whole pixel

  // A page of 5000 x 5000 points would be 10,417 pixels square at 150 dpi: past what a browser can hold.
  const big = await PDFDocument.create();
  big.addPage([5000, 5000]);
  await page.goto("/pdf-to-png");
  await page.setInputFiles('input[type="file"]', { name: "poster.pdf", mimeType: "application/pdf", buffer: Buffer.from(await big.save()) });
  await page.getByRole("button", { name: "Convert 1 page to PNG" }).click();
  await expect(page.getByText("1 large page was drawn at a lower resolution than you chose")).toBeVisible({ timeout: 60_000 });
  const small = pictureSize(read(await download(page, "Download Page 1")));
  expect(small.width * small.height).toBeLessThanOrEqual(16_000_000);
  expect(small.width).toBeGreaterThan(3000);
});

test("extract text: the words, page marks, a page range, and a scan that has none", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/extract-text");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await page.getByRole("button", { name: "Extract text" }).click();
  const box = page.getByRole("region", { name: "Extracted text", exact: true });
  await expect(box).toContainText("text-3p — page 1 of 3");
  await expect(box).toContainText("Line 1: the quick brown fox jumps over the lazy dog.");
  await expect(page.getByTestId("word-count")).toContainText("words");
  await expect(page.getByTestId("text-result")).toContainText("from 3 of 3 pages");
  await audit(page, "extract text, result");

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByLabel("Pages to read").fill("2");
  await page.getByRole("checkbox", { name: /Add a line before each page/ }).check();
  await page.getByRole("button", { name: "Extract text" }).click();
  await expect(box).toContainText("--- Page 2 ---");
  await expect(box).toContainText("page 2 of 3");
  await expect(box).not.toContainText("page 1 of 3");

  // A scan is pictures, not text: the tool says so instead of returning nothing quietly.
  await page.goto("/extract-text");
  await page.setInputFiles('input[type="file"]', fixture("scan-jpeg.pdf"));
  await page.getByRole("button", { name: "Extract text" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no text to extract" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "OCR) is not built yet" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Extracted text", exact: true })).toHaveCount(0);
  noProblems(outside, errors);
});

test("wave 1 tools in dark mode: the loaded state of the busiest pages has no accessibility violations", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/page-numbers");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByTestId("number-mark")).toBeVisible();
  await audit(page, "page numbers, dark");
  await page.goto("/images-to-pdf");
  await page.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: await makePicture(page, 80, 60, "image/png") });
  await expect(page.getByText("80 × 60")).toBeVisible();
  await audit(page, "images to PDF, dark");
  await page.goto("/pdf-to-jpg");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" }).locator("img")).toBeVisible({ timeout: 30_000 });
  await audit(page, "PDF to JPG, dark");
});
