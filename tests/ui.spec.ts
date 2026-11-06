import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { download, fixture, pageCount, watchErrors, watchOutbound } from "./helpers";

test("header: the All tools menu opens, lists the tools, and Escape closes it and returns focus", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "All tools" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("#all-tools");
  for (const name of ["Merge PDF", "Compress PDF", "Delete PDF pages", "Extract PDF pages"]) {
    await expect(panel.getByRole("link", { name })).toBeVisible();
  }
  await page.screenshot({ path: "test-results/shots/menu-open.png" });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(button).toBeFocused();

  await button.click();
  await panel.getByRole("link", { name: "Extract PDF pages" }).click();
  await expect(page).toHaveURL(/\/extract-pdf-pages$/);
  await expect(page.locator("#all-tools")).toHaveCount(0); // navigating closes it
});

test("search: finds tools by name and by synonym, says so when nothing matches, Enter opens the first", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("searchbox", { name: "Search tools" });
  await box.fill("shrink"); // a keyword, not in the tool's name
  await expect(page.getByRole("list", { name: "Matching tools" }).getByRole("link", { name: /Compress PDF/ }).first()).toBeVisible();
  await box.fill("zzzz");
  await expect(page.getByText(/No tool matches/)).toBeVisible();
  await box.fill("merge");
  await page.screenshot({ path: "test-results/shots/search.png" });
  await box.press("Enter");
  await expect(page).toHaveURL(/\/merge-pdf$/);
});

test("how-it-works page and the 404 page", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How it works and your privacy");
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/That page doesn.t exist/);
  await expect(page.locator("main").getByRole("link", { name: /Merge PDF/ })).toBeVisible();
});

test("tool pages carry a breadcrumb, steps, questions and related tools", async ({ page }) => {
  await page.goto("/compress-pdf");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Compress PDF");
  await expect(page.getByRole("heading", { name: "How to use Compress PDF" })).toBeVisible();
  const q = page.getByText("Why did my file barely shrink?");
  await q.click();
  await expect(page.getByText(/already stored as compressed JPEG/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "More tools" })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!).map((x: { "@type": string }) => x["@type"])).toEqual(["BreadcrumbList", "WebApplication"]);
});

test("compress-to-a-size page: preselected, honest, links to the other sizes", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/compress-pdf-to-1mb");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compress PDF to 1 MB");
  await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
  await expect(page.getByLabel("Target size")).toBeChecked();
  await expect(page.getByRole("combobox")).toHaveValue(String(1024 * 1024));
  await page.getByRole("button", { name: "Compress PDF" }).click();
  const out = await download(page, "Download compressed PDF");
  expect(fs.statSync(out).size).toBeLessThanOrEqual(1024 * 1024);
  expect(await pageCount(out)).toBe(3);
  await expect(page.getByTestId("result-note")).toContainText("Target reached by optimising"); // text kept: no image conversion needed
  const sizes = page.getByRole("region", { name: "Compress to a specific size" });
  await expect(sizes.getByRole("link", { name: "5 MB" })).toBeVisible();
  await expect(sizes.getByRole("link", { name: "1 MB" })).toHaveCount(0); // the current page is not linked to itself
  expect(outside).toEqual([]);
});

test("every page loads without console errors or policy violations", async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ["/", "/merge-pdf", "/compress-pdf", "/delete-pdf-pages", "/extract-pdf-pages", "/compress-pdf-to-5mb", "/how-it-works"]) {
    await page.goto(path, { waitUntil: "networkidle" });
  }
  expect(errors).toEqual([]);
});
