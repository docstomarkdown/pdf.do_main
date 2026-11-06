import { test, expect } from "@playwright/test";
import { download, fixture, pageCount, pageText, watchErrors, watchOutbound } from "./helpers";

test("delete pages: thumbnails appear, click a page, get the rest in order", async ({ page, context, baseURL }, info) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/delete-pdf-pages");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));

  const p2 = page.getByRole("checkbox", { name: "Page 2" });
  await expect(p2).toBeVisible();
  await expect(p2.locator("img")).toBeVisible({ timeout: 30_000 }); // thumbnail rendered (also proves the CSP allows blob images)
  await p2.click();
  await expect(p2).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: `test-results/shots/delete-select-${info.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Delete 1 page" }).click();
  await expect(page.getByTestId("pages-after")).toHaveText("2 pages");
  await page.screenshot({ path: `test-results/shots/delete-result-${info.project.name}.png`, fullPage: true });

  const out = await download(page, "Download PDF without those pages");
  expect(await pageCount(out)).toBe(2);
  expect(await pageText(out, 1)).toContain("page 1 of 3");
  expect(await pageText(out, 2)).toContain("page 3 of 3");
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("delete pages: the range field and the thumbnails stay in step, and bad input is explained", async ({ page }) => {
  await page.goto("/delete-pdf-pages");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  const field = page.getByLabel("Pages to delete");
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();

  await field.fill("1, 3");
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("checkbox", { name: "Page 2" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("checkbox", { name: "Page 3" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "Delete 2 pages" })).toBeEnabled();

  await page.getByRole("checkbox", { name: "Page 2" }).click(); // now all three: the field reformats to a range
  await expect(field).toHaveValue("1-3");

  await expect(page.getByText("That is every page. Keep at least one.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete 3 pages" })).toBeDisabled();

  await field.fill("9");
  await expect(page.getByText("Pages go from 1 to 3.")).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("button", { name: "Delete pages" })).toBeDisabled();
  await page.getByRole("button", { name: "Invert" }).click();
  await expect(field).toHaveValue("1-3");
});

test("extract pages: type a range, get just those pages", async ({ page, context, baseURL }, info) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/extract-pdf-pages");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await page.getByLabel("Pages to keep").fill("1, 3");
  await page.getByRole("button", { name: "Extract 2 pages" }).click();
  await expect(page.getByTestId("pages-after")).toHaveText("2 pages");
  await page.screenshot({ path: `test-results/shots/extract-result-${info.project.name}.png`, fullPage: true });

  const out = await download(page, "Download extracted PDF");
  expect(await pageCount(out)).toBe(2);
  expect(await pageText(out, 1)).toContain("page 1 of 3");
  expect(await pageText(out, 2)).toContain("page 3 of 3");
  expect(outside).toEqual([]);
});

test("a result flows into the next tool without a second upload", async ({ page }) => {
  await page.goto("/merge-pdf");
  await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
  await expect(page.getByText(/^3 pages ·/)).toBeVisible();
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(page.getByTestId("merge-result")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Delete PDF pages" }).click(); // "Keep going with this file"
  await expect(page).toHaveURL(/\/delete-pdf-pages$/);
  await expect(page.getByText("Carried over from Merge PDF.")).toBeVisible();
  await expect(page.getByText("merged.pdf")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Page 5" })).toBeVisible({ timeout: 30_000 }); // 2 + 3 pages, read from memory

  await page.getByLabel("Pages to delete").fill("1-2");
  await page.getByRole("button", { name: "Delete 2 pages" }).click();
  const out = await download(page, "Download PDF without those pages");
  expect(await pageCount(out)).toBe(3);
  expect(await pageText(out, 1)).toContain("text-3p — page 1 of 3");
});
