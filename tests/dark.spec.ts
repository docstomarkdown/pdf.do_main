import { expect, test } from "@playwright/test";
import { audit, chooseOption, fixture } from "./helpers";

// The site follows the device's light or dark setting (decisions/0007). These run every kind of page, and each tool
// in each state, with the device set to dark: the colours must really be dark, and still pass WCAG A/AA contrast.
const PAGES = ["/", "/merge-pdf", "/compress-pdf", "/compress-pdf-to-1mb", "/delete-pdf-pages", "/extract-pdf-pages", "/split-pdf", "/rotate-pdf", "/page-numbers", "/edit-pdf-metadata", "/images-to-pdf", "/pdf-to-jpg", "/pdf-to-png", "/extract-text", "/encrypt-pdf", "/remove-password", "/unlock-pdf", "/organize-pages", "/split-pdf-in-half", "/crop-pdf", "/pdf-size-analyzer", "/txt-to-pdf", "/extract-images", "/split-pdf-by-size", "/add-watermark", "/sign-pdf", "/split-pdf-by-bookmarks", "/repair-pdf", "/scan-to-pdf", "/heic-to-pdf", "/pdf-to-markdown", "/fill-pdf-form", "/privacy-scanner", "/compare-pdfs", "/how-it-works", "/licences", "/no-such-page"];

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" });

  test("the page is dark: surface, text and colour scheme follow the device", async ({ page }) => {
    await page.goto("/");
    const style = await page.evaluate(() => ({
      surface: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }));
    expect(style).toEqual({ surface: "rgb(15, 23, 42)", text: "rgb(241, 245, 249)", scheme: "dark" });
  });

  for (const path of PAGES) {
    test(`${path} has no WCAG A/AA violations in dark`, async ({ page }) => {
      await page.goto(path);
      await audit(page, `${path} (dark)`);
    });
  }

  test("the All tools menu and the search results, in dark", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "All tools" }).click();
    await audit(page, "menu open (dark)");
    await page.keyboard.press("Escape");
    await page.getByRole("searchbox", { name: "Search tools" }).fill("compress");
    await audit(page, "search results (dark)");
    await page.getByRole("searchbox", { name: "Search tools" }).fill("zzzz");
    await audit(page, "search with no match (dark)");
  });

  test("merge and delete pages, with files, selections and results, in dark", async ({ page }) => {
    await page.goto("/merge-pdf");
    await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
    await page.getByText(/^3 pages ·/).waitFor();
    await audit(page, "merge, two files (dark)");
    await page.getByRole("button", { name: "Merge PDFs" }).click();
    await page.getByTestId("merge-result").waitFor({ timeout: 60_000 });
    await audit(page, "merge result (dark)");

    await page.goto("/delete-pdf-pages");
    await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
    await page.getByRole("checkbox", { name: "Page 2" }).locator("img").waitFor({ timeout: 30_000 });
    await page.getByRole("checkbox", { name: "Page 2" }).click();
    await audit(page, "delete pages, a selection (dark)");
    await page.getByRole("button", { name: "Delete 1 page" }).click();
    await page.getByTestId("delete-result").waitFor({ timeout: 60_000 });
    await audit(page, "delete pages result (dark)");
  });

  test("compress: options, the smart result and the target-size warning, in dark", async ({ page }) => {
    await page.goto("/compress-pdf");
    await page.setInputFiles('input[type="file"]', fixture("image-heavy.pdf"));
    await audit(page, "compress, file chosen (dark)");
    await chooseOption(page, /Target size/);
    await audit(page, "compress, target size options (dark)");
    await page.getByRole("combobox").selectOption({ label: "200 KB" });
    await page.getByRole("button", { name: "Compress PDF" }).click();
    await page.getByTestId("compress-result").waitFor({ timeout: 170_000 });
    await expect(page.getByTestId("result-note")).toContainText("Text is no longer selectable");
    await page.waitForTimeout(500); // let the panel's focus and scroll settle
    await audit(page, "compress, target-size result with its warning (dark)");
  });
});

test.describe("light mode", () => {
  test.use({ colorScheme: "light" });

  test("the page is light when the device is", async ({ page }) => {
    await page.goto("/");
    const style = await page.evaluate(() => ({
      surface: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }));
    expect(style).toEqual({ surface: "rgb(255, 255, 255)", text: "rgb(15, 23, 42)", scheme: "light" });
  });
});
