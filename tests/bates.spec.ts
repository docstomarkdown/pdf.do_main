import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import { audit, download, fixture, pageCount, pageText, watchErrors, watchOutbound } from "./helpers";

// Bates numbering. Every output is read back with pdf.js: which identifier is on which page, and which pages have none.
// The first test also asserts that the browser made no request outside its own origin and logged no console error.

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

test("bates numbering: the preview shows the identifier, every page of the saved PDF carries its own, and the next start is given", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/bates-numbering");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));

  // With nothing typed it is a plain padded number.
  const mark = page.getByTestId("number-mark");
  await expect(mark).toHaveText("000001");
  await page.getByLabel("Prefix").fill("ABC");
  await expect(mark).toHaveText("ABC000001");
  await expect(page.getByText("Page 1 gets “ABC000001”.")).toBeVisible();
  await expect(page.getByTestId("bates-plan")).toHaveText("ABC000001 to ABC000003");

  // The identifier is placed bottom right to begin with, and moves with the grid.
  const start = await mark.evaluate((el) => ({ right: (el as HTMLElement).style.right, bottom: (el as HTMLElement).style.bottom }));
  expect(start.right).not.toBe("");
  expect(start.bottom).not.toBe("");
  await page.getByRole("radio", { name: "Top left" }).check({ force: true });
  const moved = await mark.evaluate((el) => ({ left: (el as HTMLElement).style.left, top: (el as HTMLElement).style.top }));
  expect(moved.left).not.toBe("");
  expect(moved.top).not.toBe("");
  await audit(page, "bates numbering, preview");

  await page.getByRole("button", { name: "Number 3 pages" }).click();
  await expect(page.getByTestId("bates-count")).toHaveText("3 pages numbered");
  await expect(page.getByTestId("bates-range")).toHaveText("ABC000001 to ABC000003");
  await expect(page.getByTestId("bates-next")).toHaveText("4");
  const out = await download(page, "Download numbered PDF");
  expect(await pageCount(out)).toBe(3);
  for (const n of [1, 2, 3]) {
    const text = await pageText(out, n);
    expect(text, `page ${n}`).toContain(`ABC00000${n}`);
    for (const other of [1, 2, 3].filter((o) => o !== n)) expect(text, `page ${n} must not carry page ${other}'s identifier`).not.toContain(`ABC00000${other}`);
  }
  await audit(page, "bates numbering, result");
  noProblems(outside, errors);
});

test("bates numbering: start number, digits, suffix and chosen pages; a number longer than the digits is written in full", async ({ page }) => {
  await page.goto("/bates-numbering");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await page.getByLabel("Prefix").fill("X-");
  await page.getByLabel("Suffix").fill("-A");
  await page.getByLabel("Digits").selectOption("3");
  await page.getByLabel("Start at").fill("999");
  await page.getByLabel("Pages to number").fill("2-3");

  // Page 1 is not in the range, so the preview says so; page 2 is the first one numbered.
  await expect(page.getByText("Page 1 is not numbered.")).toBeVisible();
  await expect(page.getByTestId("number-mark")).toHaveCount(0);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByTestId("number-mark")).toHaveText("X-999-A");
  await expect(page.getByTestId("bates-plan")).toHaveText("X-999-A to X-1000-A");

  await page.getByRole("button", { name: "Number 2 pages" }).click();
  await expect(page.getByTestId("bates-range")).toHaveText("X-999-A to X-1000-A");
  await expect(page.getByTestId("bates-next")).toHaveText("1001");
  const out = await download(page, "Download numbered PDF");
  expect(await pageText(out, 1)).not.toContain("X-");
  expect(await pageText(out, 2)).toContain("X-999-A");
  expect(await pageText(out, 3)).toContain("X-1000-A");
});

test("bates numbering: a character the font cannot write is refused before anything runs, and a bad start number too", async ({ page }) => {
  await page.goto("/bates-numbering");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("button", { name: "Number 2 pages" })).toBeEnabled();

  await page.getByLabel("Prefix").fill("தமிழ்");
  await expect(page.getByText(/The font cannot write “த”/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Number 2 pages" })).toBeDisabled();
  await expect(page.getByTestId("number-mark")).toHaveCount(0);
  await expect(page.getByTestId("bates-plan")).toHaveText("Fix the field marked above first.");

  // Accented Latin letters are fine.
  await page.getByLabel("Prefix").fill("ÉTÉ-");
  await expect(page.getByTestId("number-mark")).toHaveText("ÉTÉ-000001");
  await expect(page.getByRole("button", { name: "Number 2 pages" })).toBeEnabled();

  await page.getByLabel("Start at").fill("1.5");
  await expect(page.getByText("Type a whole number, such as 1.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Number 2 pages" })).toBeDisabled();
  await page.getByLabel("Start at").fill("7");
  await page.getByRole("button", { name: "Number 2 pages" }).click();
  const out = await download(page, "Download numbered PDF");
  expect(await pageText(out, 1)).toContain("ÉTÉ-000007");
  expect(await pageText(out, 2)).toContain("ÉTÉ-000008");
});

test("bates numbering: a page that is already turned still gets its identifier, and the turn is kept", async ({ page }) => {
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();
  await page.getByRole("button", { name: "Turn right" }).click(); // every page
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const saved = await download(page, "Download rotated PDF");
  const turned = `test-results/turned-bates-${test.info().project.name}.pdf`; // a download has no .pdf name, which the file chooser needs
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(saved, turned);

  await page.goto("/bates-numbering");
  await page.setInputFiles('input[type="file"]', turned);
  await page.getByLabel("Prefix").fill("T");
  await page.getByRole("button", { name: "Number 2 pages" }).click();
  const out = await download(page, "Download numbered PDF");
  expect(await pageText(out, 1)).toContain("T000001");
  expect(await pageText(out, 2)).toContain("T000002");
  const doc = await PDFDocument.load(fs.readFileSync(out));
  expect(doc.getPage(0).getRotation().angle).toBe(90);
});
