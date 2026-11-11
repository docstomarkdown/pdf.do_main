import { test, expect, type Page } from "@playwright/test";
import { download, fixture, pageCount, watchErrors } from "./helpers";

// A phone-sized WebKit. These check layout and touch use, not the engines (the desktop projects cover those).
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("every page fits the phone width without sideways scrolling", async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ["/", "/merge-pdf", "/compress-pdf", "/delete-pdf-pages", "/extract-pdf-pages", "/split-pdf", "/rotate-pdf", "/page-numbers", "/bates-numbering", "/add-image", "/add-text", "/make-pdf-fillable", "/annotate-pdf", "/edit-pdf-metadata", "/images-to-pdf", "/pdf-to-jpg", "/pdf-to-png", "/extract-text", "/encrypt-pdf", "/remove-password", "/unlock-pdf", "/organize-pages", "/split-pdf-in-half", "/crop-pdf", "/pdf-size-analyzer", "/txt-to-pdf", "/extract-images", "/split-pdf-by-size", "/add-watermark", "/sign-pdf", "/split-pdf-by-bookmarks", "/repair-pdf", "/scan-to-pdf", "/heic-to-pdf", "/pdf-to-markdown", "/fill-pdf-form", "/privacy-scanner", "/compare-pdfs", "/compress-pdf-to-200kb", "/how-it-works", "/licences", "/blog"]) {
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

test("the busiest wave 1 pages fit the phone with a file loaded", async ({ page }) => {
  for (const [path, file] of [["/split-pdf", "text-3p.pdf"], ["/page-numbers", "text-3p.pdf"], ["/bates-numbering", "text-3p.pdf"], ["/pdf-to-jpg", "text-3p.pdf"], ["/rotate-pdf", "text-3p.pdf"], ["/edit-pdf-metadata", "text-2p.pdf"]] as const) {
    await page.goto(path);
    await page.setInputFiles('input[type="file"]', fixture(file));
    await page.getByText(/pages? ·/).first().waitFor();
    await page.waitForTimeout(500);
    expect(await noSideScroll(page), `${path} with a file scrolls sideways`).toBe(true);
  }
  await page.goto("/images-to-pdf");
  await page.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  await page.getByText("1 × 1").waitFor();
  expect(await noSideScroll(page), "/images-to-pdf with a file scrolls sideways").toBe(true);
});

test("a blog post fits the phone: no sideways scroll, and the table scrolls inside its own box", async ({ page }) => {
  await page.goto("/blog");
  const link = page.getByTestId("post-card").first().getByRole("heading", { level: 2 }).getByRole("link");
  test.skip((await link.count()) === 0, "no posts yet");
  await page.goto((await link.getAttribute("href"))!);
  expect(await noSideScroll(page)).toBe(true);
  for (const region of await page.locator(".table-scroll").all()) {
    const box = (await region.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
});
