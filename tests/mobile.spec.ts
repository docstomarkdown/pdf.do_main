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
  // The menu is all the navigation a phone has, so the search and the pages about the site are in it.
  await expect(panel.getByRole("searchbox", { name: "Search all tools" })).toBeVisible();
  for (const name of ["How it works and your privacy", "Blog", "Licences"]) await expect(panel.getByRole("link", { name })).toBeVisible();
  await page.screenshot({ path: "test-results/shots/menu-phone.png" });
  await panel.getByRole("link", { name: "Compress PDF" }).tap();
  await expect(page).toHaveURL(/\/compress-pdf$/);
});

test("the main controls are big enough to tap (at least 44 px)", async ({ page }) => {
  await page.goto("/merge-pdf");
  const choose = page.getByRole("button", { name: "Choose PDF files" });
  await expect(choose).toBeVisible();
  expect((await choose.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole("button", { name: "All tools" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
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

/**
 * Everything on the page a thumb can tap that is under 44 px tall, as "what: height". A `.tap` link counts with the
 * unseen margin around it. Left out: a link in running text, which is as tall as its line (and a post's own prose),
 * and anything inside a list that is folded shut.
 */
const smallTargets = (page: Page) => page.evaluate(() => {
  const small: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('a[href], button, summary, select, textarea, input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])')) {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (box.width <= 1 || box.height <= 1 || style.visibility === "hidden") continue; // not on screen (or only for screen readers)
    if (el.closest(".blog-prose")) continue;
    let folded = false;
    for (let up = el.parentElement; up; up = up.parentElement) {
      if (up instanceof HTMLDetailsElement && !up.open && !(el.tagName === "SUMMARY" && el.parentElement === up)) folded = true;
    }
    if (folded) continue;
    const after = getComputedStyle(el, "::after");
    const margin = after.content !== "none" && after.position === "absolute" ? parseFloat(after.height) || 0 : 0;
    const inText = style.display === "inline" && margin === 0 && (el.parentElement?.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 12;
    if (inText) continue;
    const height = Math.max(box.height, margin);
    if (height < 44) small.push(`${(el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().replace(/\s+/g, " ").slice(0, 40)}: ${Math.round(height)}`);
  }
  return small;
});

test("everything you tap on a phone is at least 44 px tall", async ({ page }) => {
  const paths = ["/", "/compress-pdf", "/compress-pdf-to-200kb", "/txt-to-pdf", "/blog", "/how-it-works", "/licences"];
  await page.goto("/blog");
  const post = page.getByTestId("post-card").first();
  if ((await post.count()) > 0) {
    paths.push((await post.getByRole("heading", { level: 2 }).getByRole("link").getAttribute("href"))!);
    const tag = post.locator("a.pill-link").first();
    if ((await tag.count()) > 0) paths.push((await tag.getAttribute("href"))!);
  }
  for (const path of paths) {
    await page.goto(path);
    expect(await smallTargets(page), `small tap targets on ${path}`).toEqual([]);
  }

  // The menu's rows, which only exist while it is open.
  await page.goto("/");
  await page.getByRole("button", { name: "All tools" }).tap();
  await expect(page.locator("#all-tools").getByRole("link", { name: "Merge PDF" })).toBeVisible();
  expect(await smallTargets(page), "small tap targets in the open menu").toEqual([]);
});

test("a small link takes a tap just outside its letters", async ({ page }) => {
  // The breadcrumb's "Home" is 20 px tall. The 44 px comes from an unseen margin, so tap in the margin, above the word.
  await page.goto("/compress-pdf");
  const home = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home" });
  const box = (await home.boundingBox())!;
  expect(box.height).toBeLessThan(44);
  await page.touchscreen.tap(box.x + box.width / 2, box.y - 8);
  await expect(page).toHaveURL(/\/$/);
});

test("the footer on a phone: lists fold under their titles, About stays open, and a folded list opens to its links", async ({ page }) => {
  await page.goto("/compress-pdf");
  const footer = page.getByRole("contentinfo");
  // With all eight lists open it was 2,237 px, half of this page. Folded, with About open, it is about 830 px.
  expect((await footer.boundingBox())!.height, "footer height").toBeLessThan(1000);
  const titles = footer.locator("summary");
  await expect(titles).toHaveCount(8);
  for (const title of await titles.all()) expect((await title.boundingBox())!.height, await title.innerText()).toBeGreaterThanOrEqual(44);

  // The pages about the site are not in the header on a phone, so their list starts open.
  for (const name of ["How it works and your privacy", "Blog", "Licences"]) await expect(footer.getByRole("link", { name })).toBeVisible();

  const sign = footer.getByRole("link", { name: "Sign PDF" });
  await expect(sign).toBeHidden();
  await footer.getByRole("heading", { name: "Edit", exact: true }).tap();
  await expect(sign).toBeVisible();
  expect((await sign.boundingBox())!.height, "a link in an opened list").toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: "test-results/shots/footer-phone.png" });
  await sign.tap();
  await expect(page).toHaveURL(/\/sign-pdf$/);
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
