import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { chooseOption, download, fixture, pageCount, pageText, size, watchOutbound } from "./helpers";

test("home lists the tools and is marked noindex", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Do anything with a PDF");
  const main = page.locator("main");
  for (const name of [/Merge PDF/, /Compress PDF/, /Delete PDF pages/, /Extract PDF pages/]) {
    await expect(main.getByRole("link", { name }).first()).toBeVisible();
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.screenshot({ path: "test-results/shots/home-desktop.png", fullPage: true });
});

test("merge: two PDFs become one with every page", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/merge-pdf");
  await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
  await expect(page.getByText(/^2 pages ·/)).toBeVisible();
  await expect(page.getByText(/^3 pages ·/)).toBeVisible();
  await page.screenshot({ path: "test-results/shots/merge-files-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(page.getByRole("link", { name: "Download merged PDF" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("merge-result")).toContainText("5 pages");
  await page.screenshot({ path: "test-results/shots/merge-result-desktop.png", fullPage: true });

  expect(await pageCount(await download(page, "Download merged PDF"))).toBe(5);
  expect(outside, "requests that left the origin").toEqual([]);
});

test("merge: reordering changes the order of pages", async ({ page }) => {
  await page.goto("/merge-pdf");
  await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
  await expect(page.getByText(/^3 pages ·/)).toBeVisible();
  await page.getByRole("button", { name: "Move text-3p.pdf up" }).click();
  expect(await page.locator("li p.truncate").allTextContents()).toEqual(["text-3p.pdf", "text-2p.pdf"]);
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  const out = await download(page, "Download merged PDF");
  expect(await pageText(out, 1)).toContain("text-3p — page 1 of 3");
  expect(await pageText(out, 4)).toContain("text-2p — page 1 of 2");
});

test("compress (smart): smaller, same pages, text still selectable", async ({ page, context, baseURL }, info) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByRole("link", { name: "Download compressed PDF" })).toBeVisible({ timeout: 120_000 });
  await page.screenshot({ path: `test-results/shots/compress-smart-${info.project.name}.png`, fullPage: true });

  const out = await download(page, "Download compressed PDF");
  const before = size("image-heavy.pdf");
  const after = fs.statSync(out).size;
  console.log(`[${info.project.name}] smart: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
  expect(await pageCount(out)).toBe(3);
  expect(after).toBeLessThanOrEqual(before);
  expect(await pageText(out, 1)).toContain("Scan 1");
  expect(outside).toEqual([]);
});

test("compress (target size): lands under 200 KB, keeps every page", async ({ page, context, baseURL }, info) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
  await chooseOption(page, /Target size/);
  await page.getByRole("combobox").selectOption({ label: "200 KB" });
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByRole("link", { name: "Download compressed PDF" })).toBeVisible({ timeout: 170_000 });
  await page.screenshot({ path: `test-results/shots/compress-target-${info.project.name}.png`, fullPage: true });

  const out = await download(page, "Download compressed PDF");
  const after = fs.statSync(out).size;
  console.log(`[${info.project.name}] target 200 KB: ${size("image-heavy.pdf")} -> ${after} bytes; note: ${await page.getByTestId("result-note").textContent()}`);
  expect(await pageCount(out)).toBe(3);
  expect(after).toBeLessThanOrEqual(200 * 1024);
  expect(outside).toEqual([]);
});

test("compress on an already-JPEG scan: says plainly that Smart mode saved almost nothing", async ({ page }, info) => {
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("scan-jpeg.pdf"));
  await page.getByRole("button", { name: "Compress PDF" }).click();
  const out = await download(page, "Download compressed PDF");
  const before = size("scan-jpeg.pdf");
  const after = fs.statSync(out).size;
  console.log(`[${info.project.name}] smart on JPEG scan: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller); UI: ${await page.getByTestId("result-note").textContent()}`);
  expect(await pageCount(out)).toBe(3);
  expect(after).toBeLessThanOrEqual(before);
  if (after > before * 0.97) {
    await expect(page.getByTestId("result-note")).toContainText(/already compressed JPEGs/);
    await expect(page.getByTestId("result-note")).toContainText(/Target size/);
  }
});

test("target size on an already-JPEG scan reaches 500 KB and says text is no longer selectable", async ({ page }, info) => {
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("scan-jpeg.pdf"));
  await chooseOption(page, /Target size/);
  await page.getByRole("combobox").selectOption({ label: "500 KB" });
  await page.getByRole("button", { name: "Compress PDF" }).click();
  const out = await download(page, "Download compressed PDF");
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(out, `test-results/out-scan-target-${info.project.name}.pdf`);
  const after = fs.statSync(out).size;
  console.log(`[${info.project.name}] target 500 KB on JPEG scan: ${size("scan-jpeg.pdf")} -> ${after} bytes; ${await page.getByTestId("result-note").textContent()}`);
  expect(await pageCount(out)).toBe(3);
  expect(after).toBeLessThanOrEqual(500 * 1024);
  await expect(page.getByTestId("result-note")).toContainText(/no longer selectable/);
});

test("a non-PDF is ignored instead of crashing", async ({ page }) => {
  await page.goto("/merge-pdf");
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/not-a-pdf.txt", "hello");
  await page.setInputFiles('input[type="file"]', "test-results/not-a-pdf.txt");
  await expect(page.getByRole("button", { name: "Choose PDF files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Merge PDFs" })).toHaveCount(0);
});
