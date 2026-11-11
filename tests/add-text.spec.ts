import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import { audit, download, fixture, pageCount, pageText, watchErrors, watchOutbound } from "./helpers";

// Add text to PDF. Saved files are read back with pdf.js: which page carries which text, and where it sits. The first test
// also asserts that the browser made no request outside its own origin and logged no console error.

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

/** Where a piece of text sits on a saved page: its left edge, its baseline (from the bottom) and its width, in points. */
async function placeOf(file: string, pageNumber: number, needle: string): Promise<{ x: number; y: number; width: number } | null> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 });
  try {
    const content = await (await (await task.promise).getPage(pageNumber)).getTextContent();
    for (const item of content.items) {
      if ("str" in item && item.str.includes(needle)) return { x: item.transform[4], y: item.transform[5], width: item.width };
    }
    return null;
  } finally {
    await task.destroy();
  }
}

test("add text: two boxes on two pages, placed with the grid, and found on the saved pages where the preview put them", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/add-text");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByText("Nothing is typed yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add text", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Add a text box" }).click();
  const text = page.getByLabel("Text", { exact: true });
  await expect(text).toBeFocused();
  await expect(page.getByTestId("text-box")).toHaveText("Type here");
  await text.fill("Signed in Chennai");
  await expect(page.getByTestId("text-box")).toHaveText("Signed in Chennai");
  await page.getByRole("radio", { name: "Top left" }).check({ force: true });
  await expect(page.getByTestId("text-plan")).toHaveText("1 text box on 1 page");
  await audit(page, "add text, one box selected");

  // A second box, on page 2, with two lines, red and bold.
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByTestId("text-count")).toHaveText("No text on page 2 yet.");
  await page.getByRole("button", { name: "Add a text box" }).click();
  await page.getByLabel("Text", { exact: true }).fill("Checked by\nA. Reviewer");
  await page.getByRole("radio", { name: "Red" }).check({ force: true });
  await page.getByRole("checkbox", { name: "Bold" }).check();
  await expect(page.getByTestId("text-plan")).toHaveText("2 text boxes on 2 pages");

  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await expect(page.getByTestId("text-done")).toHaveText("2 text boxes added on 2 pages");
  const out = await download(page, "Download PDF with the text");
  expect(await pageCount(out)).toBe(3);
  expect(await pageText(out, 1)).toContain("Signed in Chennai");
  expect(await pageText(out, 2)).toContain("Checked by");
  expect(await pageText(out, 2)).toContain("A. Reviewer");
  expect(await pageText(out, 2)).not.toContain("Signed in Chennai");
  expect(await pageText(out, 3)).not.toContain("Signed in Chennai");
  expect(await pageText(out, 3)).not.toContain("Checked by");

  // Top left on the grid is a centre 18% across and 12% down (the page is 595 by 842 points; the text is 12 pt).
  const first = (await placeOf(out, 1, "Signed in Chennai"))!;
  expect(first.x + first.width / 2).toBeCloseTo(0.18 * 595, 0);
  expect(Math.abs(first.y - (0.88 * 842 + 7.2 - 11.4))).toBeLessThan(1.5);
  // The second line sits one line (1.2 times the size) below the first.
  const upper = (await placeOf(out, 2, "Checked by"))!;
  const lower = (await placeOf(out, 2, "A. Reviewer"))!;
  expect(upper.y - lower.y).toBeCloseTo(12 * 1.2, 0);
  expect(lower.x).toBeCloseTo(upper.x, 0); // both lines start at the same left edge
  await audit(page, "add text, result");
  noProblems(outside, errors);
});

test("add text: move with the keyboard, remove, undo and redo", async ({ page }) => {
  await page.goto("/add-text");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Add a text box" }).click();
  await page.getByLabel("Text", { exact: true }).fill("Draft");
  const mark = page.getByRole("group", { name: /Text box 1/ });
  await expect(mark).toHaveAttribute("style", /top: 20%/);
  await mark.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(mark).toHaveAttribute("style", /top: 24%/);

  await page.getByRole("button", { name: "Remove this box" }).click();
  await expect(page.getByTestId("text-box")).toHaveCount(0);
  await expect(page.getByTestId("text-plan")).toHaveText("Nothing is typed yet.");
  await expect(page.getByRole("button", { name: "Add text", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("text-box")).toHaveText("Draft");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByTestId("text-box")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();

  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const out = await download(page, "Download PDF with the text");
  const place = (await placeOf(out, 1, "Draft"))!;
  expect(Math.abs(place.y - (0.76 * 842 + 7.2 - 11.4))).toBeLessThan(1.5); // 24% down from the top
  expect(await pageText(out, 2)).not.toContain("Draft");
});

test("add text: a character the font cannot write is refused before anything runs", async ({ page }) => {
  await page.goto("/add-text");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Add a text box" }).click();
  await page.getByLabel("Text", { exact: true }).fill("வணக்கம்");
  await expect(page.getByText(/The font cannot write “வ”/)).toBeVisible();
  await expect(page.getByTestId("text-plan")).toHaveText("A text box has a character the font cannot write.");
  await expect(page.getByRole("button", { name: "Add text", exact: true })).toBeDisabled();
  await page.getByLabel("Text", { exact: true }).fill("Café, 12 €");
  await expect(page.getByRole("button", { name: "Add text", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  expect(await pageText(await download(page, "Download PDF with the text"), 1)).toContain("Café, 12 €");
});

test("add text: a page that is already turned still gets its text, and the turn is kept", async ({ page }) => {
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();
  await page.getByRole("button", { name: "Turn right" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const saved = await download(page, "Download rotated PDF");
  const turned = `test-results/turned-text-${test.info().project.name}.pdf`;
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(saved, turned);

  await page.goto("/add-text");
  await page.setInputFiles('input[type="file"]', turned);
  await page.getByRole("button", { name: "Add a text box" }).click();
  await page.getByLabel("Text", { exact: true }).fill("Sideways page");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const out = await download(page, "Download PDF with the text");
  expect(await pageText(out, 1)).toContain("Sideways page");
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect(doc.getPage(0).getRotation().angle).toBe(90);
});
