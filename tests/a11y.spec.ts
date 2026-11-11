import { test } from "@playwright/test";
import { audit, chooseOption, fixture } from "./helpers";

// Automated WCAG 2 A/AA checks with axe. They find roughly a third of real accessibility problems, so they
// are a floor, not a verdict: keyboard and screen-reader use still need a human pass.
test.describe("accessibility", () => {
  for (const path of ["/", "/merge-pdf", "/compress-pdf", "/compress-pdf-to-1mb", "/delete-pdf-pages", "/split-pdf", "/rotate-pdf", "/page-numbers", "/bates-numbering", "/add-image", "/add-text", "/make-pdf-fillable", "/annotate-pdf", "/edit-pdf-metadata", "/images-to-pdf", "/pdf-to-jpg", "/pdf-to-png", "/extract-text", "/encrypt-pdf", "/remove-password", "/unlock-pdf", "/organize-pages", "/split-pdf-in-half", "/crop-pdf", "/pdf-size-analyzer", "/txt-to-pdf", "/extract-images", "/split-pdf-by-size", "/add-watermark", "/sign-pdf", "/split-pdf-by-bookmarks", "/repair-pdf", "/scan-to-pdf", "/heic-to-pdf", "/pdf-to-markdown", "/fill-pdf-form", "/privacy-scanner", "/compare-pdfs", "/how-it-works", "/licences", "/blog", "/no-such-page"]) {
    test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
      await page.goto(path);
      await audit(page, path);
    });
  }

  test("the All tools menu and the search results", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "All tools" }).click();
    await audit(page, "menu open");
    await page.keyboard.press("Escape");
    await page.getByRole("searchbox", { name: "Search tools" }).fill("compress");
    await audit(page, "search results");
  });

  test("tools with a file loaded, and with a result", async ({ page }) => {
    await page.goto("/merge-pdf");
    await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
    await page.getByText(/^3 pages ·/).waitFor();
    await audit(page, "merge, two files");
    await page.getByRole("button", { name: "Merge PDFs" }).click();
    await page.getByTestId("merge-result").waitFor({ timeout: 60_000 });
    await audit(page, "merge result");

    await page.goto("/delete-pdf-pages");
    await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
    await page.getByRole("checkbox", { name: "Page 2" }).locator("img").waitFor({ timeout: 30_000 });
    await page.getByRole("checkbox", { name: "Page 2" }).click();
    await audit(page, "delete pages, thumbnails with a selection");

    await page.goto("/compress-pdf");
    await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
    await audit(page, "compress, file chosen");
    await chooseOption(page, /Target size/);
    await audit(page, "compress, target size options");
  });
});
