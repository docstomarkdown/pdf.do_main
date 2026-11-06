import { test, expect, type Page } from "@playwright/test";
import { download, fixture, pageCount, watchErrors } from "./helpers";

// A phone-sized WebKit. These check layout and touch use, not the engines (the desktop projects cover those).
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("every page fits the phone width without sideways scrolling", async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ["/", "/merge-pdf", "/compress-pdf", "/delete-pdf-pages", "/extract-pdf-pages", "/compress-pdf-to-200kb", "/how-it-works"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    expect(await noSideScroll(page), `${path} scrolls sideways`).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("home and the menu on a phone", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/shots/home-phone.png", fullPage: true });
  await page.getByRole("button", { name: "All tools" }).tap();
  const panel = page.locator("#all-tools");
  await expect(panel.getByRole("link", { name: "Merge PDF" })).toBeVisible();
  await page.screenshot({ path: "test-results/shots/menu-phone.png" });
  await panel.getByRole("link", { name: "Compress PDF" }).tap();
  await expect(page).toHaveURL(/\/compress-pdf$/);
});

test("the main controls are big enough to tap (at least 44 px)", async ({ page }) => {
  await page.goto("/merge-pdf");
  const choose = page.getByRole("button", { name: "Choose PDF files" });
  await expect(choose).toBeVisible();
  expect((await choose.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole("button", { name: "All tools" }).boundingBox())!.height).toBeGreaterThanOrEqual(36);
  await page.screenshot({ path: "test-results/shots/merge-phone.png", fullPage: true });

  await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
  await expect(page.getByText(/^3 pages ·/)).toBeVisible();
  for (const name of ["Move text-3p.pdf up", "Remove text-3p.pdf"]) {
    const box = (await page.getByRole("button", { name }).boundingBox())!;
    expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40);
    expect(box.width, `${name} width`).toBeGreaterThanOrEqual(40);
  }
  await page.screenshot({ path: "test-results/shots/merge-files-phone.png", fullPage: true });
});

test("delete pages with a thumb: tap pages, the action bar stays in reach, download works", async ({ page }) => {
  await page.goto("/delete-pdf-pages");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  const p2 = page.getByRole("checkbox", { name: "Page 2" });
  await expect(p2.locator("img")).toBeVisible({ timeout: 30_000 });
  await p2.tap();
  const act = page.getByRole("button", { name: "Delete 1 page" });
  await expect(act).toBeInViewport(); // the sticky bar keeps the action on screen
  await page.screenshot({ path: "test-results/shots/delete-phone.png" });
  await act.tap();
  await expect(page.getByTestId("pages-after")).toHaveText("2 pages");
  await page.screenshot({ path: "test-results/shots/delete-result-phone.png", fullPage: true });
  expect(await pageCount(await download(page, "Download PDF without those pages"))).toBe(2);
});
