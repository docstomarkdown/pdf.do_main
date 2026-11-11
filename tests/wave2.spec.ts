import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, PDFHexString, PDFName, PDFString } from "@cantoo/pdf-lib";
import { unzipSync } from "fflate";
import { audit, download, fixture, pageCount, pageText, quiet, watchErrors, watchOutbound, watchTraffic } from "./helpers";

// Wave 2 tools. Every output is read back; every test asserts that the browser made no request outside its own
// origin and logged no console error.

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

// Count every page's requests from the start, so `go` knows what is still in flight when it leaves.
test.beforeEach(({ page }) => { watchTraffic(page); });

/**
 * Opens another page once the current one has stopped loading. A page that shows a link to another tool prefetches it, and
 * WebKit reports a prefetch cut short by the next navigation as a page error that no visitor would see. The load state
 * alone is not enough: it is reached once, and a link that appears later (a message, the result, "More tools" scrolled
 * into view) starts its prefetch after that. `quiet` waits for those too.
 */
async function go(page: Page, path: string) {
  await page.waitForLoadState("networkidle");
  await quiet(page);
  await page.goto(path);
}

/** A download has no .pdf name, which the file chooser needs: copy it to a name that has one. */
function asPdf(saved: string, name: string): string {
  fs.mkdirSync("test-results", { recursive: true });
  const to = `test-results/${name}-${test.info().project.name}.pdf`;
  fs.copyFileSync(saved, to);
  return to;
}

/** A PDF that opens without a password but forbids printing, made with the site's own qpdf in the page. */
async function restrictedPdf(page: Page): Promise<Buffer> {
  await page.goto("/");
  await page.addScriptTag({ url: "/engines/vendor/qpdf.js" });
  const plain = Array.from(fs.readFileSync(fixture("text-2p.pdf")));
  const out = await page.evaluate(async (arr) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qpdf = await (window as any).Module({ locateFile: () => "/engines/vendor/qpdf.wasm", print: () => {}, printErr: () => {} });
    qpdf.FS.writeFile("/in.pdf", new Uint8Array(arr));
    qpdf.callMain(["/in.pdf", "--encrypt", "", "owner-secret", "256", "--print=none", "--", "/out.pdf"]);
    return Array.from(qpdf.FS.readFile("/out.pdf") as Uint8Array);
  }, plain);
  return Buffer.from(out);
}

test("passwords: add one, see that the file is locked, then open it with the right and the wrong password", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/encrypt-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByLabel("Password", { exact: true }).fill("short");
  await expect(page.getByText("Use at least 6 characters.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add password" })).toBeDisabled();
  await page.getByLabel("Password", { exact: true }).fill("correct horse");
  await page.getByLabel("Type it again").fill("correct hors");
  await expect(page.getByText("The two passwords are not the same.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add password" })).toBeDisabled();
  await page.getByLabel("Type it again").fill("correct horse");
  await audit(page, "protect, password typed");
  await page.getByRole("button", { name: "Add password" }).click();
  await expect(page.getByText("Password added")).toBeVisible();
  const saved = await download(page, "Download protected PDF");
  const locked = asPdf(saved, "locked");

  // It really is locked: pdf-lib refuses it unless told to ignore the encryption.
  const bytes = fs.readFileSync(locked);
  await expect(PDFDocument.load(bytes)).rejects.toThrow();
  expect((await PDFDocument.load(bytes, { ignoreEncryption: true })).isEncrypted).toBe(true);

  // The other tools meet it politely.
  await go(page, "/encrypt-pdf");
  await page.setInputFiles('input[type="file"]', locked);
  await expect(page.getByText("This PDF already has a password.")).toBeVisible();
  await go(page, "/unlock-pdf");
  await page.setInputFiles('input[type="file"]', locked);
  await expect(page.getByText(/needs a password to open, so there is nothing to unlock/)).toBeVisible();
  await audit(page, "unlock, a file that needs a password");

  // Remove the password: the wrong one is refused in plain words, the right one gives a file that opens freely.
  await go(page, "/remove-password");
  await page.setInputFiles('input[type="file"]', locked);
  await page.getByLabel("Password to open this file").fill("wrong guess");
  await page.getByRole("button", { name: "Remove password" }).click();
  await expect(page.getByText("That password did not open the file.")).toBeVisible();
  await expect(page.getByTestId("security-result")).toHaveCount(0);
  await page.getByLabel("Password to open this file").fill("correct horse");
  await page.getByRole("button", { name: "Remove password" }).click();
  await expect(page.getByText("Password removed")).toBeVisible();
  const opened = await download(page, "Download PDF without a password");
  expect(await pageCount(opened)).toBe(2);
  expect(await pageText(opened, 2)).toContain("page 2 of 2");
  expect((await PDFDocument.load(fs.readFileSync(opened), { ignoreEncryption: true })).isEncrypted).toBe(false);
  noProblems(outside, errors);
});

test("passwords: a file with no password, and a file with restrictions only", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const restricted = await restrictedPdf(page);

  await go(page, "/remove-password");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByText("This PDF has no password, so there is nothing to remove.")).toBeVisible();
  await go(page, "/unlock-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByText("This PDF has no restrictions, so there is nothing to unlock.")).toBeVisible();

  await go(page, "/remove-password");
  await page.setInputFiles('input[type="file"]', { name: "restricted.pdf", mimeType: "application/pdf", buffer: restricted });
  await expect(page.getByText(/opens without a password, but it has restrictions/)).toBeVisible();
  await go(page, "/encrypt-pdf");
  await page.setInputFiles('input[type="file"]', { name: "restricted.pdf", mimeType: "application/pdf", buffer: restricted });
  await expect(page.getByText("This PDF already has restrictions.")).toBeVisible();

  await go(page, "/unlock-pdf");
  await page.setInputFiles('input[type="file"]', { name: "restricted.pdf", mimeType: "application/pdf", buffer: restricted });
  await expect(page.getByRole("button", { name: "Remove restrictions" })).toBeVisible();
  await audit(page, "unlock, a file with restrictions");
  await page.getByRole("button", { name: "Remove restrictions" }).click();
  await expect(page.getByText("Restrictions removed")).toBeVisible();
  const freed = await download(page, "Download unlocked PDF");
  expect((await PDFDocument.load(fs.readFileSync(freed), { ignoreEncryption: true })).isEncrypted).toBe(false);
  expect(await pageCount(freed)).toBe(2);

  // Not a PDF at all.
  await go(page, "/unlock-pdf");
  await page.setInputFiles('input[type="file"]', { name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("this is not a pdf") });
  await expect(page.getByText("This file could not be read as a PDF.")).toBeVisible();
  noProblems(outside, errors);
});

/** A one-page PDF of the given size, optionally stored turned, with a mark on each side so a cut can be told apart. */
async function pageOf(width: number, height: number, turn = 0): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  page.drawText("LEFT", { x: 40, y: height / 2, size: 20 });
  page.drawText("RIGHT", { x: width - 120, y: height / 2, size: 20 });
  if (turn) page.setRotation({ type: "degrees" as never, angle: turn } as never);
  return Buffer.from(await doc.save());
}

test("organise: move, turn and delete on the grid, undo, and read the new order back", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/organize-pages");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("radio", { name: "Page 3" })).toBeAttached();
  await expect(page.getByRole("button", { name: "Save new PDF" })).toBeDisabled();
  await expect(page.getByTestId("organize-status")).toHaveText("Nothing has changed yet.");

  await page.getByRole("radio", { name: "Page 3" }).check({ force: true });
  await page.getByRole("button", { name: "Move earlier" }).click();
  await page.getByRole("button", { name: "Rotate" }).click();
  await expect(page.getByTestId("organize-status")).toHaveText("3 of 3 pages will be kept");
  await audit(page, "organise, pages changed");
  await page.getByRole("button", { name: "Save new PDF" }).click();
  await expect(page.getByTestId("organize-pages")).toHaveText("3 pages");
  const out = await download(page, "Download organised PDF");
  expect(await pageText(out, 1)).toContain("page 1 of 3");
  expect(await pageText(out, 2)).toContain("page 3 of 3");
  expect(await pageText(out, 3)).toContain("page 2 of 3");
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect([0, 1, 2].map((i) => doc.getPage(i).getRotation().angle)).toEqual([0, 90, 0]);

  // Delete a page, then undo it.
  await page.getByRole("button", { name: "Back to options" }).click();
  await page.getByRole("radio", { name: "Page 1" }).check({ force: true });
  await page.getByRole("button", { name: "Delete page" }).click();
  await expect(page.getByTestId("organize-status")).toHaveText("2 of 3 pages will be kept");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("organize-status")).toHaveText("3 of 3 pages will be kept");
  await page.getByRole("button", { name: "Back to the original" }).click();
  await expect(page.getByTestId("organize-status")).toHaveText("Nothing has changed yet.");
  noProblems(outside, errors);
});

test("split in half: each page cut left and right, a turned page cut as it is seen, and the document in two files", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/split-pdf-in-half");
  await page.setInputFiles('input[type="file"]', { name: "spread.pdf", mimeType: "application/pdf", buffer: await pageOf(600, 400) });
  await expect(page.getByTestId("cut-line")).toBeVisible();
  await audit(page, "split in half, preview");
  await page.getByRole("button", { name: "Cut each page in two" }).click();
  await expect(page.getByTestId("half-pages")).toHaveText("2 pages");
  const sides = await PDFDocument.load(fs.readFileSync(await download(page, "Download PDF with each page cut in two")));
  expect(sides.getPageCount()).toBe(2);
  expect(sides.getPage(0).getCropBox()).toEqual({ x: 0, y: 0, width: 300, height: 400 }); // left first
  expect(sides.getPage(1).getCropBox()).toEqual({ x: 300, y: 0, width: 300, height: 400 });

  // Top and bottom: the top half first.
  await page.getByRole("button", { name: "Back to options" }).click();
  await page.getByRole("radio", { name: "Top and bottom" }).check({ force: true });
  await expect(page.getByTestId("cut-line")).toHaveClass(/cutline-h/);
  await page.getByRole("button", { name: "Cut each page in two" }).click();
  const rows = await PDFDocument.load(fs.readFileSync(await download(page, "Download PDF with each page cut in two")));
  expect(rows.getPage(0).getCropBox()).toEqual({ x: 0, y: 200, width: 600, height: 200 });
  expect(rows.getPage(1).getCropBox()).toEqual({ x: 0, y: 0, width: 600, height: 200 });

  // A page stored turned a quarter clockwise: its visual left half is the bottom of its own axes.
  await go(page, "/split-pdf-in-half");
  await page.setInputFiles('input[type="file"]', { name: "turned.pdf", mimeType: "application/pdf", buffer: await pageOf(400, 600, 90) });
  await page.getByRole("button", { name: "Cut each page in two" }).click();
  const turned = await PDFDocument.load(fs.readFileSync(await download(page, "Download PDF with each page cut in two")));
  expect(turned.getPage(0).getCropBox()).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  expect(turned.getPage(1).getCropBox()).toEqual({ x: 0, y: 300, width: 400, height: 300 });

  // The document in two files.
  await go(page, "/split-pdf-in-half");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await page.getByRole("radio", { name: /The document/ }).check({ force: true });
  await expect(page.getByTestId("half-plan")).toHaveText("3 pages become a file of 2 pages and a file of 1 page.");
  await page.getByRole("button", { name: "Split into two files" }).click();
  const files = unzipSync(new Uint8Array(fs.readFileSync(await download(page, /^Download all/))));
  expect(Object.keys(files).sort()).toEqual(["text-3p-first-half.pdf", "text-3p-second-half.pdf"]);
  expect((await PDFDocument.load(files["text-3p-first-half.pdf"])).getPageCount()).toBe(2);
  expect((await PDFDocument.load(files["text-3p-second-half.pdf"])).getPageCount()).toBe(1);
  noProblems(outside, errors);
});

test("crop: the preview follows the sliders, the saved boxes are right, only chosen pages are cropped, and it says the cut area stays", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/crop-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("button", { name: "Crop PDF" })).toBeDisabled();
  await page.getByRole("slider", { name: /^Top/ }).fill("20");
  await page.getByRole("slider", { name: /^Left/ }).fill("10");
  const frame = page.getByTestId("crop-frame");
  await expect(frame).toHaveCSS("top", /.+/);
  expect(await frame.evaluate((el) => ({ top: (el as HTMLElement).style.top, left: (el as HTMLElement).style.left }))).toEqual({ top: "20%", left: "10%" });
  await audit(page, "crop, sliders moved");
  await page.getByLabel("Pages to crop").fill("2");
  await page.getByRole("button", { name: "Crop PDF" }).click();
  await expect(page.getByTestId("cropped-count")).toHaveText("1 page cropped");
  await expect(page.getByText("Cropping hides the area you cut off")).toBeVisible();
  const doc = await PDFDocument.load(fs.readFileSync(await download(page, "Download cropped PDF")));
  const first = doc.getPage(0).getCropBox();
  const second = doc.getPage(1).getCropBox();
  expect(first.width).toBeCloseTo(595, 0); // untouched
  expect(second.x).toBeCloseTo(59.5, 1); // 10% of 595 from the left
  expect(second.y).toBeCloseTo(0, 1);
  expect(second.width).toBeCloseTo(535.5, 1);
  expect(second.height).toBeCloseTo(673.6, 1); // 20% of 842 from the top
  noProblems(outside, errors);
});

test("size analyzer: where the bytes go, for a file full of pictures and for one with none", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/pdf-size-analyzer");
  await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
  const report = page.getByTestId("size-report");
  await expect(report).toBeVisible({ timeout: 30_000 });
  const legend = report.getByRole("list", { name: "What takes the space" });
  await expect(legend.getByRole("listitem")).toHaveCount(5);
  await expect(legend.getByRole("listitem").first()).toContainText("Pictures (");
  const shares = await legend.getByRole("listitem").evaluateAll((items) => items.map((li) => parseInt(/(\d+)%/.exec(li.textContent ?? "")![1], 10)));
  expect(shares[0]).toBeGreaterThan(50); // the pictures are most of it
  expect(shares.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(98);
  await expect(page.getByText(/Pictures make up \d+% of this file\./)).toBeVisible();
  await expect(page.locator("a.link", { hasText: "Compress PDF" })).toBeVisible(); // the pointer in the message, not the menu or footer
  await expect(page.getByRole("list", { name: "Biggest pictures" }).or(page.locator("dl[aria-label='Biggest pictures']")).locator("dt").first()).toHaveText("Picture 1");
  await audit(page, "size analyzer, a file with pictures");

  await go(page, "/pdf-size-analyzer");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByTestId("size-report")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("so there is less to gain from compressing them")).toBeVisible();
  noProblems(outside, errors);
});

test("text to PDF: pages made from text, a file opened, accents kept, other scripts flagged", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/txt-to-pdf");
  await expect(page.getByRole("button", { name: "Make PDF" })).toBeDisabled();
  const lines = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}: café crème, the quick brown fox.`).join("\n");
  await page.getByLabel("Text", { exact: true }).fill(lines);
  await audit(page, "text to PDF, text typed");
  await page.getByRole("button", { name: "Make PDF" }).click();
  const pages = Number((await page.getByTestId("text-pdf-pages").textContent())!.split(" ")[0]);
  expect(pages).toBeGreaterThan(1); // 120 lines do not fit one page
  const out = await download(page, "Download PDF");
  expect(await pageCount(out)).toBe(pages);
  expect(await pageText(out, 1)).toContain("Line 1: café crème");
  await expect(page.getByText("not in the standard PDF fonts")).toHaveCount(0);

  // Other scripts come out as ?, and the page says how many.
  await page.getByRole("button", { name: "Back to options" }).click();
  await page.getByLabel("Text", { exact: true }).fill("Hello 日本語 world");
  await page.getByRole("button", { name: "Make PDF" }).click();
  await expect(page.getByText("3 characters are not in the standard PDF fonts")).toBeVisible();
  expect(await pageText(await download(page, "Download PDF"), 1)).toContain("Hello ??? world");

  // A .txt file fills the box, and a very long word is broken instead of running off the page.
  await go(page, "/txt-to-pdf");
  await page.setInputFiles('input[type="file"]', { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("A".repeat(300) + "\nsecond line") });
  await expect(page.getByLabel("Text", { exact: true })).toHaveValue(/^A{300}\nsecond line$/);
  await page.getByRole("button", { name: "Make PDF" }).click();
  const doc = await PDFDocument.load(fs.readFileSync(await download(page, "Download PDF")));
  expect(doc.getPageCount()).toBe(1);
  expect((await pageText(await download(page, "Download PDF"), 1)).replace(/\s/g, "")).toContain("A".repeat(300) + "secondline");
  noProblems(outside, errors);
});

test("extract images: the pictures of a PDF as PNG, and a page with none says so", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/extract-images");
  await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
  await page.getByRole("button", { name: "Extract pictures" }).click();
  await expect(page.getByTestId("picture-count")).toContainText("picture", { timeout: 60_000 });
  const found = Number((await page.getByTestId("picture-count").textContent())!.split(" ")[0]);
  expect(found).toBeGreaterThan(0);
  const first = fs.readFileSync(await download(page, "Download Picture 1"));
  expect(Array.from(first.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]); // a real PNG
  expect(first.readUInt32BE(16)).toBeGreaterThanOrEqual(32);
  await audit(page, "extract images, result");
  if (found > 1) {
    const zip = unzipSync(new Uint8Array(fs.readFileSync(await download(page, /^Download all/))));
    expect(Object.keys(zip)).toHaveLength(found);
  }

  await go(page, "/extract-images");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await page.getByRole("button", { name: "Extract pictures" }).click();
  await expect(page.getByText(/No pictures of 32 pixels or more were found/)).toBeVisible();
  noProblems(outside, errors);
});

test("split by size: files under the limit, pages kept in order, and a limit that is too small explained", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const total = await pageCount(fixture("image-heavy.pdf"));
  await go(page, "/split-pdf-by-size");
  await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
  await page.getByLabel("Largest file").fill("0");
  await expect(page.getByText("Type a size, such as 1.")).toBeVisible();
  await page.getByLabel("Largest file").fill("5");
  await page.getByLabel("Unit").selectOption("KB");
  await expect(page.getByText("The smallest limit is 20 KB.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Split PDF" })).toBeDisabled();
  await page.getByLabel("Largest file").fill("4");
  await page.getByLabel("Unit").selectOption("MB");
  await audit(page, "split by size, limit typed");
  await page.getByRole("button", { name: "Split PDF" }).click();
  await expect(page.getByTestId("by-size-count")).toContainText("file");
  const results = page.getByTestId("by-size-result");
  const marked = await results.getByText("over the limit").count();
  const zipLink = results.getByRole("link", { name: /^Download all/ });
  if (await zipLink.count()) {
    const files = unzipSync(new Uint8Array(fs.readFileSync(await download(page, /^Download all/))));
    const names = Object.keys(files).sort();
    let pagesSeen = 0;
    for (const name of names) {
      pagesSeen += (await PDFDocument.load(files[name])).getPageCount();
      if (marked === 0) expect(files[name].length, name).toBeLessThanOrEqual(4 * 1024 * 1024);
    }
    expect(pagesSeen).toBe(total); // every page, once
    expect(names[0]).toMatch(/image-heavy-part-1\.pdf$/);
  }
  noProblems(outside, errors);
});

/** The text items of a page with where they sit: the matrix [a, b, c, d, e, f] and the width, in points. */
async function textItems(file: string, pageNumber: number) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 });
  try {
    const content = await (await (await task.promise).getPage(pageNumber)).getTextContent();
    return content.items.filter((i) => "str" in i).map((i) => ({ str: (i as { str: string }).str, matrix: (i as { transform: number[] }).transform, width: (i as { width: number }).width }));
  } finally {
    await task.destroy();
  }
}

test("watermark: text on chosen pages, centred where the preview says, at the angle chosen, on turned pages too", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/add-watermark");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByTestId("watermark-text")).toHaveText("CONFIDENTIAL");
  await expect(page.getByTestId("watermark-position")).toHaveText("Centre at 50% across and 50% down.");
  await page.getByLabel("Text", { exact: true }).fill("DRAFT");
  await expect(page.getByTestId("watermark-text")).toHaveText("DRAFT");
  await page.getByRole("radio", { name: "Top left" }).check({ force: true });
  await expect(page.getByTestId("watermark-position")).toHaveText("Centre at 18% across and 12% down.");
  await page.getByLabel("Pages to mark").fill("2");
  await audit(page, "watermark, placed");
  await page.getByRole("button", { name: "Add watermark" }).click();
  await expect(page.getByTestId("marked-count")).toHaveText("1 page marked");
  const out = await download(page, "Download watermarked PDF");
  expect((await textItems(out, 1)).some((i) => i.str === "DRAFT")).toBe(false); // page 1 was not chosen
  const mark = (await textItems(out, 2)).find((i) => i.str === "DRAFT")!;
  expect(mark).toBeDefined();
  const [a, b, , , e, f] = mark.matrix;
  const theta = Math.atan2(b, a);
  expect((theta * 180) / Math.PI).toBeCloseTo(45, 0); // -45 as seen on screen is 45 degrees counter-clockwise in the file
  const half = 64 * 0.36;
  const cx = e + (mark.width / 2) * Math.cos(theta) - half * Math.sin(theta);
  const cy = f + (mark.width / 2) * Math.sin(theta) + half * Math.cos(theta);
  expect(cx).toBeCloseTo(0.18 * 595, -1); // within 5 points of where the preview put it
  expect(cy).toBeCloseTo(0.88 * 842, -1);

  // Turned pages: the text follows the page as it is seen.
  await go(page, "/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Turn right" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const turned = asPdf(await download(page, "Download rotated PDF"), "turned-wm");
  await go(page, "/add-watermark");
  await page.setInputFiles('input[type="file"]', turned);
  await page.getByRole("button", { name: "Add watermark" }).click();
  const marked = await textItems(await download(page, "Download watermarked PDF"), 1);
  const seen = marked.find((i) => i.str === "CONFIDENTIAL")!;
  expect((Math.atan2(seen.matrix[1], seen.matrix[0]) * 180) / Math.PI).toBeCloseTo(135, 0); // 45 as seen plus the page's own quarter turn
  noProblems(outside, errors);
});

/** A PDF of `pages` pages with a top-level bookmark for each [title, 1-based page], written by hand (pdf-lib has no outline call). */
async function withBookmarks(pages: number, bookmarks: [string, number][]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) doc.addPage([300, 300]).drawText(`Page ${i}`, { x: 50, y: 150, size: 20 });
  const ctx = doc.context;
  const root = ctx.nextRef();
  const refs = bookmarks.map(() => ctx.nextRef());
  bookmarks.forEach(([title, at], i) => {
    ctx.assign(refs[i], ctx.obj({
      Title: PDFHexString.fromText(title), Parent: root, Dest: [doc.getPage(at - 1).ref, PDFName.of("Fit")],
      ...(i > 0 ? { Prev: refs[i - 1] } : {}), ...(i < refs.length - 1 ? { Next: refs[i + 1] } : {}),
    }));
  });
  ctx.assign(root, ctx.obj({ Type: "Outlines", First: refs[0], Last: refs[refs.length - 1], Count: refs.length }));
  doc.catalog.set(PDFName.of("Outlines"), root);
  return Buffer.from(await doc.save());
}

test("split by bookmarks: a file for each chapter, the pages before the first bookmark, and a PDF with no bookmarks", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/split-pdf-by-bookmarks");
  await page.setInputFiles('input[type="file"]', { name: "book.pdf", mimeType: "application/pdf", buffer: await withBookmarks(5, [["Chapter 1", 2], ["Chapter 2/Intro", 4]]) });
  const list = page.getByRole("list", { name: "Files this will make" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByRole("listitem").nth(0)).toContainText("Before the first bookmark");
  await expect(list.getByRole("listitem").nth(0)).toContainText("page 1");
  await expect(list.getByRole("listitem").nth(1)).toContainText("Chapter 1");
  await expect(list.getByRole("listitem").nth(1)).toContainText("pages 2 to 3");
  await expect(list.getByRole("listitem").nth(2)).toContainText("pages 4 to 5");
  await audit(page, "split by bookmarks, sections listed");
  await page.getByRole("button", { name: "Split into 3 files" }).click();
  await expect(page.getByTestId("bookmarks-count")).toHaveText("3 files");
  const files = unzipSync(new Uint8Array(fs.readFileSync(await download(page, /^Download all/))));
  const names = Object.keys(files).sort();
  expect(names).toEqual(["book-1-Before the first bookmark.pdf", "book-2-Chapter 1.pdf", "book-3-Chapter 2-Intro.pdf"]); // a slash in a title cannot make a folder
  expect((await PDFDocument.load(files[names[1]])).getPageCount()).toBe(2);
  expect((await PDFDocument.load(files[names[2]])).getPageCount()).toBe(2);

  await go(page, "/split-pdf-by-bookmarks");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByText("This PDF has no bookmarks to split at.")).toBeVisible();
  noProblems(outside, errors);
});

/**
 * Where the first picture on a page is drawn, as the matrix that places its unit square: [width, 0, 0, height, x, y] in points.
 * pdf.js lists the drawing steps; the matrices in force at the picture are multiplied in order.
 */
async function firstPicture(file: string, pageNumber: number): Promise<number[] | null> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 });
  try {
    const list = await (await (await task.promise).getPage(pageNumber)).getOperatorList();
    const at = list.fnArray.findIndex((fn: number) => fn === pdfjs.OPS.paintImageXObject);
    if (at < 0) return null;
    const mul = (m: number[], n: number[]) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    // Follow the drawing steps from the top of the page with a stack of saved states, as a PDF reader does.
    let ctm = [1, 0, 0, 1, 0, 0];
    const saved: number[][] = [];
    for (let i = 0; i < at; i++) {
      const fn = list.fnArray[i];
      if (fn === pdfjs.OPS.save) saved.push(ctm);
      else if (fn === pdfjs.OPS.restore) ctm = saved.pop() ?? ctm;
      else if (fn === pdfjs.OPS.transform) ctm = mul(ctm, list.argsArray[i] as number[]);
    }
    return ctm;
  } finally {
    await task.destroy();
  }
}

test("sign: draw a signature, place it with the grid, and find it on the saved page where the preview put it", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/sign-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("button", { name: "Add signature" })).toBeDisabled();
  const pad = page.getByTestId("signature-pad");
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 30, { steps: 8 });
  await page.mouse.move(box.x + 160, box.y + box.height - 30, { steps: 8 });
  await page.mouse.move(box.x + 230, box.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("signature-preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add signature" })).toBeEnabled();
  await page.getByRole("radio", { name: "Bottom right" }).check({ force: true });
  await expect(page.getByTestId("signature-position")).toHaveText("Centre at 82% across and 88% down, 28% of the page wide.");
  await audit(page, "sign, signature drawn and placed");
  await page.getByRole("radio", { name: "Last page" }).check({ force: true });
  await page.getByRole("button", { name: "Add signature" }).click();
  await expect(page.getByTestId("signed-count")).toHaveText("1 page signed");
  await expect(page.getByText("It is not a digital signature")).toBeVisible();
  const out = await download(page, "Download signed PDF");
  expect(await firstPicture(out, 1)).toBeNull(); // only the last page was chosen
  const m = (await firstPicture(out, 3))!;
  expect(m).not.toBeNull();
  expect(m[0]).toBeCloseTo(0.28 * 595, 0); // its width is 28% of the page
  expect(m[4] + m[0] / 2).toBeCloseTo(0.82 * 595, 0); // centred 82% across
  expect(m[5] + m[3] / 2).toBeCloseTo(0.12 * 842, 0); // and 88% down from the top
  noProblems(outside, errors);

  // Typed and uploaded signatures.
  await go(page, "/sign-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("radio", { name: "Type" }).check({ force: true });
  await page.getByLabel("Your name").fill("A. Writer");
  await expect(page.getByTestId("signature-preview")).toBeVisible();
  await page.getByRole("button", { name: "Add signature" }).click();
  expect(await firstPicture(await download(page, "Download signed PDF"), 1)).not.toBeNull();
  await go(page, "/sign-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("radio", { name: "Upload" }).check({ force: true });
  await page.locator('input[type="file"]').last().setInputFiles({ name: "sig.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  await expect(page.getByTestId("signature-preview")).toBeVisible();
});

test("repair: a file with a broken index comes back with every page, and the page says it mended something", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const good = fs.readFileSync(fixture("text-3p.pdf"));
  const broken = good.subarray(0, good.length - 40); // the end of the file, with the index and its pointer, is cut off
  await go(page, "/repair-pdf");
  await page.setInputFiles('input[type="file"]', { name: "broken.pdf", mimeType: "application/pdf", buffer: broken });
  await audit(page, "repair, file chosen");
  await page.getByRole("button", { name: "Repair PDF" }).click();
  await expect(page.getByTestId("repair-pages")).toHaveText("3 pages recovered");
  await expect(page.getByText(/could not be read as it was, so the copy was rebuilt/)).toBeVisible();
  const out = await download(page, "Download repaired PDF");
  expect(await pageCount(out)).toBe(3);
  expect(await pageText(out, 3)).toContain("page 3 of 3");

  // A healthy file is simply rewritten, and the page says nothing was wrong.
  await go(page, "/repair-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Repair PDF" }).click();
  await expect(page.getByText(/No structural problems were found/)).toBeVisible();

  // Not a PDF at all.
  await go(page, "/repair-pdf");
  await page.setInputFiles('input[type="file"]', { name: "junk.pdf", mimeType: "application/pdf", buffer: Buffer.from("this is not a pdf at all") });
  await page.getByRole("button", { name: "Repair PDF" }).click();
  await expect(page.getByText("This file is too damaged to repair here.")).toBeVisible();
  noProblems(outside, errors);
});

test("scan and HEIC: the camera button, a page of photos made into a PDF, and a HEIC file this browser cannot open", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/scan-to-pdf");
  await expect(page.getByRole("button", { name: "Take a photo of a page" })).toBeVisible();
  expect(await page.locator('input[type="file"][capture="environment"]').count()).toBe(1); // the phone's camera
  const photo = await (async () => {
    const data = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 200; c.height = 280; const x = c.getContext("2d")!; x.fillStyle = "white"; x.fillRect(0, 0, 200, 280); x.fillStyle = "black"; x.fillRect(20, 20, 160, 20); return c.toDataURL("image/png"); });
    return Buffer.from(data.split(",")[1], "base64");
  })();
  await page.locator('input[type="file"][capture="environment"]').setInputFiles({ name: "page-1.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByRole("button", { name: "Take another photo" })).toBeVisible();
  await page.getByRole("button", { name: "Make a PDF of 1 image" }).click();
  expect(await pageCount(await download(page, "Download PDF"))).toBe(1);

  await go(page, "/heic-to-pdf");
  await page.setInputFiles('input[type="file"]', { name: "IMG_0001.heic", mimeType: "image/heic", buffer: Buffer.from("not really a heic file") });
  await expect(page.getByText(/This browser cannot open HEIC photos/)).toBeVisible();
  noProblems(outside, errors);
});

test("PDF to Markdown: a heading, a paragraph and a list come out as Markdown, and a scan says it has no text", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont((await import("@cantoo/pdf-lib")).StandardFonts.Helvetica);
  const p = doc.addPage([595, 842]);
  p.drawText("Annual Report", { x: 50, y: 780, size: 26, font });
  p.drawText("Highlights", { x: 50, y: 740, size: 18, font });
  ["Revenue grew in the second half, led by the new", "product line. Costs held flat across the year."].forEach((line, i) => p.drawText(line, { x: 50, y: 710 - i * 14, size: 11, font }));
  ["• First point", "• Second point"].forEach((line, i) => p.drawText(line.replace("•", "-"), { x: 50, y: 660 - i * 14, size: 11, font }));
  await go(page, "/pdf-to-markdown");
  await page.setInputFiles('input[type="file"]', { name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  const box = page.getByRole("region", { name: "Markdown", exact: true });
  await expect(box).toContainText("# Annual Report");
  await expect(box).toContainText("## Highlights");
  await expect(box).toContainText("Revenue grew in the second half, led by the new product line. Costs held flat across the year."); // two lines, one paragraph
  await expect(box).toContainText("- First point\n- Second point");
  await expect(page.getByTestId("markdown-result").getByText(/Headings, lists and paragraphs are guessed/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Download .md" })).toHaveAttribute("download", "report.md");
  await audit(page, "PDF to Markdown, result");

  await go(page, "/pdf-to-markdown");
  await page.setInputFiles('input[type="file"]', fixture("scan-jpeg.pdf"));
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await expect(page.getByText(/have no text|has no text/)).toBeVisible();
  noProblems(outside, errors);
});

/** A PDF with lines of text, one per line, for comparing and reading back. */
async function linesPdf(lines: string[]): Promise<Buffer> {
  const { StandardFonts } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 500]);
  lines.forEach((line, i) => page.drawText(line, { x: 40, y: 440 - i * 30, size: 14, font }));
  return Buffer.from(await doc.save());
}

test("fill form: text, a tick box, a choice and a radio group are filled and read back, and the entries can be made permanent", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const doc = await PDFDocument.create();
  const p = doc.addPage([400, 500]);
  const form = doc.getForm();
  form.createTextField("full_name").addToPage(p, { x: 50, y: 420, width: 220, height: 24 });
  form.createCheckBox("agree").addToPage(p, { x: 50, y: 380, width: 20, height: 20 });
  const country = form.createDropdown("country");
  country.addOptions(["France", "India"]);
  country.addToPage(p, { x: 50, y: 330, width: 200, height: 24 });
  const plan = form.createRadioGroup("plan");
  plan.addOptionToPage("Free", p, { x: 50, y: 290, width: 20, height: 20 });
  plan.addOptionToPage("Pro", p, { x: 100, y: 290, width: 20, height: 20 });
  const buffer = Buffer.from(await doc.save());

  await go(page, "/fill-pdf-form");
  await page.setInputFiles('input[type="file"]', { name: "form.pdf", mimeType: "application/pdf", buffer });
  await expect(page.getByTestId("form-count")).toHaveText("4 fields found.");
  await page.getByLabel("full_name").fill("Asha Rao");
  await page.getByRole("checkbox", { name: "agree" }).check();
  await page.getByLabel("country").selectOption("India");
  await page.getByLabel("plan").selectOption("Pro");
  await audit(page, "fill form, fields filled");
  await page.getByRole("button", { name: "Save filled PDF" }).click();
  const filled = await PDFDocument.load(fs.readFileSync(await download(page, "Download filled PDF")));
  const out = filled.getForm();
  expect(out.getTextField("full_name").getText()).toBe("Asha Rao");
  expect(out.getCheckBox("agree").isChecked()).toBe(true);
  expect(out.getDropdown("country").getSelected()).toEqual(["India"]);
  expect(out.getRadioGroup("plan").getSelected()).toBe("Pro");

  await page.getByRole("button", { name: "Back to options" }).click();
  await page.getByRole("checkbox", { name: /Make the entries permanent/ }).check();
  await page.getByRole("button", { name: "Save filled PDF" }).click();
  const flat = await PDFDocument.load(fs.readFileSync(await download(page, "Download filled PDF")));
  expect(flat.getForm().getFields()).toHaveLength(0); // the entries are on the page, the fields are gone

  await go(page, "/fill-pdf-form");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByText(/no fillable form fields/)).toBeVisible();
  noProblems(outside, errors);
});

test("privacy scanner: names, attachments, scripts, links, comments and earlier versions are found; a clean file is clear", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const doc = await PDFDocument.create();
  const p = doc.addPage([300, 300]);
  doc.setAuthor("Asha Rao");
  await doc.attach(Buffer.from("secret notes"), "notes.txt", { mimeType: "text/plain" });
  const ctx = doc.context;
  const link = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [10, 10, 100, 30], A: { S: "URI", URI: PDFString.of("https://example.org/private") } }));
  const note = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Text", Rect: [10, 40, 30, 60], Contents: PDFString.of("check this") }));
  p.node.set(PDFName.of("Annots"), ctx.obj([link, note]));
  doc.catalog.set(PDFName.of("OpenAction"), ctx.obj({ S: "JavaScript", JS: PDFString.of("app.alert(1)") }));
  const saved = Buffer.concat([Buffer.from(await doc.save()), Buffer.from("\n%%EOF\n")]); // a second "saved" marker, as an update would leave

  await go(page, "/privacy-scanner");
  await page.setInputFiles('input[type="file"]', { name: "shared.pdf", mimeType: "application/pdf", buffer: saved });
  const report = page.getByTestId("privacy-report");
  await expect(report).toBeVisible({ timeout: 30_000 });
  const row = (title: string) => report.getByRole("listitem").filter({ hasText: title });
  await expect(row("Document information")).toContainText("Found");
  await expect(row("Document information")).toContainText("Author: Asha Rao");
  await expect(row("Attached files")).toContainText("1 file is attached");
  await expect(row("JavaScript")).toContainText("Found");
  await expect(row("Comments and markup")).toContainText("Text");
  await expect(row("Links to web addresses")).toContainText("https://example.org/private");
  await expect(row("Earlier versions")).toContainText("Found");
  await expect(row("Location in pictures")).toContainText("Clear");
  await expect(page.getByTestId("privacy-summary")).toContainText("found");
  await audit(page, "privacy scanner, findings");

  await go(page, "/privacy-scanner");
  await page.setInputFiles('input[type="file"]', await linesPdf(["nothing to see"]).then((buffer) => ({ name: "plain.pdf", mimeType: "application/pdf", buffer })));
  await expect(page.getByTestId("privacy-report")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("privacy-report").getByRole("listitem").filter({ hasText: "JavaScript" })).toContainText("Clear");
  noProblems(outside, errors);
});

test("compare: lines added and removed on the page that differs, and identical text reported as the same", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await go(page, "/compare-pdfs");
  const first = { name: "v1.pdf", mimeType: "application/pdf", buffer: await linesPdf(["alpha", "beta", "gamma"]) };
  const second = { name: "v2.pdf", mimeType: "application/pdf", buffer: await linesPdf(["alpha", "delta", "gamma"]) };
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(first);
  await inputs.nth(1).setInputFiles(second);
  await expect(page.getByTestId("compare-summary")).toContainText("1 page differs");
  await expect(page.getByTestId("compare-summary")).toContainText("1 line added, 1 removed");
  const changes = page.getByRole("group", { name: "Changes on page 1" });
  await expect(changes).toContainText("Removed: beta");
  await expect(changes).toContainText("Added: delta");
  await expect(changes).toContainText("Unchanged: alpha");
  await audit(page, "compare, differences shown");

  await page.getByRole("button", { name: "Compare other files" }).click();
  await page.locator('input[type="file"]').nth(0).setInputFiles(first);
  await page.locator('input[type="file"]').nth(1).setInputFiles({ ...first, name: "copy.pdf" });
  await expect(page.getByTestId("compare-summary")).toHaveText("The text is the same.");
  noProblems(outside, errors);
});
