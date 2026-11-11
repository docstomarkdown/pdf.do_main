import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import { audit, download, fixture, pageCount, pageText, watchErrors, watchOutbound } from "./helpers";

// Annotate PDF. Saved files are read back with pdf.js: how many shapes each page draws, and where the first one sits.
// The first test also asserts that the browser made no request outside its own origin and logged no console error.

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

type Shape = { x: number; y: number; width: number; height: number };

/**
 * The shapes (filled or stroked paths) a page draws: how many, and where the first one sits, in points from the bottom
 * left. pdf.js lists the drawing steps; the matrices in force at the shape are multiplied in order, as a reader does.
 */
async function shapesOn(file: string, pageNumber: number): Promise<{ count: number; first: Shape | null }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 });
  try {
    const list = await (await (await task.promise).getPage(pageNumber)).getOperatorList();
    const mul = (m: number[], n: number[]) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    let ctm = [1, 0, 0, 1, 0, 0];
    const saved: number[][] = [];
    let count = 0;
    let first: Shape | null = null;
    for (let i = 0; i < list.fnArray.length; i++) {
      const fn = list.fnArray[i];
      if (fn === pdfjs.OPS.save) saved.push(ctm);
      else if (fn === pdfjs.OPS.restore) ctm = saved.pop() ?? ctm;
      else if (fn === pdfjs.OPS.transform) ctm = mul(ctm, list.argsArray[i] as number[]);
      else if (fn === pdfjs.OPS.constructPath) {
        count++;
        const box = (list.argsArray[i] as unknown[])[2] as ArrayLike<number> | undefined; // [minX, minY, maxX, maxY] in the shape's own space
        if (!first && box && box.length === 4) {
          // The two corners, whichever way round the shape was drawn.
          const xs = [ctm[4] + box[0] * ctm[0], ctm[4] + box[2] * ctm[0]];
          const ys = [ctm[5] + box[1] * ctm[3], ctm[5] + box[3] * ctm[3]];
          first = { x: Math.min(...xs), y: Math.min(...ys), width: Math.abs(xs[1] - xs[0]), height: Math.abs(ys[1] - ys[0]) };
        }
      }
    }
    return { count, first };
  } finally {
    await task.destroy();
  }
}

/** One pen stroke across the page preview, as a person draws it with a mouse. */
async function drawStroke(page: Page) {
  const layer = page.getByTestId("pen-layer");
  await layer.scrollIntoViewIfNeeded();
  const box = (await layer.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 6 });
  await page.mouse.up();
}

test("annotate: a highlight, a box and a pen line are drawn on the saved pages where the preview put them", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  expect((await shapesOn(fixture("text-3p.pdf"), 1)).count, "the test file draws no shapes of its own").toBe(0);

  await page.goto("/annotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByTestId("mark-plan")).toHaveText("No marks yet.");
  await expect(page.getByRole("button", { name: "Save marks" })).toBeDisabled();

  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.getByTestId("highlight")).toBeVisible();
  await page.getByRole("radio", { name: "Green" }).check({ force: true });
  await expect(page.getByTestId("highlight")).toHaveClass(/an-hl-green/);
  await page.getByRole("button", { name: "Box", exact: true }).click();
  await expect(page.getByTestId("outline-box")).toBeVisible();
  await audit(page, "annotate, a box selected");

  await page.getByRole("button", { name: "Draw with the pen" }).click();
  await drawStroke(page);
  await expect(page.getByTestId("pen-line")).toHaveCount(1);
  await expect(page.getByTestId("mark-count")).toHaveText("3 marks on page 1.");
  await audit(page, "annotate, drawing");
  await page.getByRole("button", { name: "Stop drawing" }).click();

  // One highlight on page 2, left where it lands: 30% wide, 2.4% tall, centred 50% across and 20% down.
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.getByTestId("mark-plan")).toHaveText("4 marks on 2 pages");

  await page.getByRole("button", { name: "Save marks" }).click();
  await expect(page.getByTestId("marks-done")).toHaveText("4 marks added on 2 pages");
  await expect(page.getByText("They are not comments")).toBeVisible();
  const out = await download(page, "Download marked PDF");
  expect(await pageCount(out)).toBe(3);
  expect(await pageText(out, 1)).toContain("page 1 of 3"); // the page's own text is untouched
  const one = await shapesOn(out, 1);
  expect(one.count).toBeGreaterThanOrEqual(4); // the highlight, the box, and a pen line of at least two segments
  const two = await shapesOn(out, 2);
  expect(two.count).toBe(1);
  expect((await shapesOn(out, 3)).count).toBe(0);
  const mark = two.first!;
  expect(mark, "the highlight's place could be read").not.toBeNull();
  expect(Math.abs(mark.width - 0.3 * 595)).toBeLessThan(1.5);
  expect(Math.abs(mark.height - 0.024 * 842)).toBeLessThan(1.5);
  expect(Math.abs(mark.x + mark.width / 2 - 0.5 * 595)).toBeLessThan(1.5);
  expect(Math.abs(mark.y + mark.height / 2 - 0.8 * 842)).toBeLessThan(1.5);
  await audit(page, "annotate, result");
  noProblems(outside, errors);
});

test("annotate: move and size with the keyboard, remove from the list, undo and redo, and change a pen line", async ({ page }) => {
  await page.goto("/annotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  const mark = page.getByRole("group", { name: "Highlight 1" });
  await expect(mark).toHaveAttribute("style", /top: 20%/);
  await mark.focus();
  await page.keyboard.press("ArrowDown");
  await expect(mark).toHaveAttribute("style", /top: 22%/);
  await page.keyboard.press("+");
  await expect(mark).toHaveAttribute("style", /width: 32%/);

  await page.getByRole("button", { name: "Draw with the pen" }).click();
  await drawStroke(page);
  await page.getByRole("button", { name: "Stop drawing" }).click();
  await expect(page.getByTestId("mark-count")).toHaveText("2 marks on page 1.");

  // The pen line is picked from the list (it cannot be picked on the page) and made thick.
  await page.getByRole("button", { name: "Pen line 1", exact: true }).click();
  const thin = await page.getByTestId("pen-line").evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth));
  await page.getByRole("checkbox", { name: "Thick line" }).check();
  await expect.poll(() => page.getByTestId("pen-line").evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth))).toBeGreaterThan(thin);

  await page.getByRole("button", { name: "Remove Highlight 1" }).click();
  await expect(page.getByTestId("highlight")).toHaveCount(0);
  await expect(page.getByTestId("mark-count")).toHaveText("1 mark on page 1.");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("highlight")).toHaveCount(1);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByTestId("highlight")).toHaveCount(0);

  await page.getByRole("button", { name: "Save marks" }).click();
  await expect(page.getByTestId("marks-done")).toHaveText("1 mark added on 1 page");
  const out = await download(page, "Download marked PDF");
  expect((await shapesOn(out, 1)).count).toBeGreaterThanOrEqual(2); // the pen line's segments
  expect((await shapesOn(out, 2)).count).toBe(0);
});

test("annotate: a page that is already turned still gets its marks, and the turn is kept", async ({ page }) => {
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();
  await page.getByRole("button", { name: "Turn right" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const turned = `test-results/turned-annotate-${test.info().project.name}.pdf`;
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(await download(page, "Download rotated PDF"), turned);

  await page.goto("/annotate-pdf");
  await page.setInputFiles('input[type="file"]', turned);
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await page.getByRole("button", { name: "Save marks" }).click();
  const out = await download(page, "Download marked PDF");
  expect((await shapesOn(out, 1)).count).toBe(1);
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect(doc.getPage(0).getRotation().angle).toBe(90);
});
