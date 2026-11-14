import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { chooseOption, download, fixture, pageCount, watchErrors, watchOutbound } from "./helpers";

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

test("search: matches the start of a word, puts a match in the name first, and the arrow keys move through the results", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("searchbox", { name: "Search tools" });
  const results = page.getByRole("list", { name: "Matching tools" }).getByRole("link");

  await box.fill("word"); // it is inside "password", and that is not a match: nothing here handles Word files
  await expect(page.getByText(/No tool matches/)).toBeVisible();
  await expect(results).toHaveCount(0);
  await box.fill("pass");
  await expect(results).toContainText(["Protect PDF with a password", "Remove PDF password", "Unlock PDF"]);
  // The site writes "analyser"; someone who types the other spelling finds the tool all the same.
  for (const typed of ["analyser", "analyzer"]) {
    await box.fill(typed);
    await expect(results).toContainText(["PDF size analyser"]);
  }

  // The four tools named "Split…" come before the one that only has "split" among its keywords.
  await box.fill("split");
  await expect(results).toContainText(["Split PDF", "Split PDF in half", "Split PDF by size", "Split PDF by bookmarks", "Extract PDF pages"]);

  await box.press("ArrowDown");
  await expect(results.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(results.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp"); // up from the first result is back in the box
  await expect(box).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape"); // from a result: the search is cleared and the box has focus again
  await expect(box).toBeFocused();
  await expect(box).toHaveValue("");
});

test("the All tools menu: one screen on a computer, with its own search and the pages about the site", async ({ page }) => {
  await page.goto("/merge-pdf");
  const button = page.getByRole("button", { name: "All tools" });
  await button.click();
  const panel = page.locator("#all-tools");
  // Four columns. In two it was 1,316 px of lists in a 708 px panel.
  expect(await panel.evaluate((el) => el.scrollHeight), "height of the menu's contents").toBeLessThan(800);
  await expect(panel.locator("h2").first()).toHaveCSS("text-transform", "none"); // sentence case, as in the footer
  for (const name of ["How it works and your privacy", "Blog", "Licences"]) await expect(panel.getByRole("link", { name })).toBeVisible();

  const box = panel.getByRole("searchbox", { name: "Search all tools" });
  await box.fill("pass");
  await expect(panel.getByRole("list", { name: "Matching tools" }).getByRole("link")).toHaveCount(3);
  await page.keyboard.press("Escape"); // the first Escape clears the search and leaves the menu open
  await expect(box).toHaveValue("");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape"); // the next one closes the menu
  await expect(panel).toHaveCount(0);
  await expect(button).toBeFocused();

  // A result opens its tool and the menu closes, also when the tool is the page you are on.
  await button.click();
  await page.locator("#all-tools").getByRole("searchbox", { name: "Search all tools" }).fill("merge");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/merge-pdf$/);
  await expect(page.locator("#all-tools")).toHaveCount(0);
});

test("how-it-works page and the 404 page", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How it works and your privacy");
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/That page doesn.t exist/);
  await expect(page.locator("main").getByRole("link", { name: /Merge PDF/ })).toBeVisible();
  // The ways out come before the list of every tool: the search, then the way home.
  const order = await page.locator("main").evaluate((main) => {
    const top = (el: Element | null) => (el ? el.getBoundingClientRect().top : NaN);
    return { search: top(main.querySelector('input[type="search"]')), home: top(main.querySelector('a[href="/"]')), firstTool: top(main.querySelector("a.tool-card")) };
  });
  expect(order.search).toBeLessThan(order.home);
  expect(order.home).toBeLessThan(order.firstTool);
  await page.getByRole("searchbox", { name: "Search tools" }).fill("merge");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/merge-pdf$/);
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
  expect(JSON.parse(ld!).map((x: { "@type": string }) => x["@type"])).toEqual(["BreadcrumbList", "WebApplication", "FAQPage"]);
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

test("compress: changing an option after a result clears the result, so the screen never shows one made another way", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByTestId("compress-result")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("button", { name: "Compress PDF" })).toHaveCount(0);

  await chooseOption(page, /Target size/);
  await expect(page.getByTestId("compress-result")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Compress PDF" })).toBeVisible();

  // The same for the size itself: a result made for one target does not stay under another.
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByTestId("compress-result")).toBeVisible({ timeout: 120_000 });
  await page.getByRole("combobox").selectOption(String(1024 * 1024));
  await expect(page.getByTestId("compress-result")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Compress PDF" })).toBeVisible();
  expect(outside).toEqual([]);
});

test("going back from a result hands keyboard focus to the tool, not to nowhere, and the result's note claims only what happened", async ({ page, browserName }) => {
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf")); // a file with no pictures in it
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByTestId("compress-result")).toBeVisible({ timeout: 120_000 });
  const note = page.getByTestId("result-note");
  await expect(note).toContainText("Text stays selectable");
  await expect(note).not.toContainText("images optimised");

  // Compress keeps the file, so its quiet button is "Back to options" and the file is still there afterwards.
  await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to options" }).press("Enter");
  await expect(page.getByTestId("compress-result")).toHaveCount(0);
  await expect(page.getByText("text-2p.pdf")).toBeVisible();
  const tool = page.getByRole("region", { name: "Compress PDF", exact: true }); // not "How to use Compress PDF"
  await expect(tool).toBeFocused();
  // The next stop is inside the tool. Safari's Tab stops only at fields unless Option is held, and the first control
  // here is a button, so there the test presses what a Safari user would.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  expect(await tool.evaluate((el) => el.contains(document.activeElement) && el !== document.activeElement)).toBe(true);
});

test("merge: its quiet button is Start over, because it clears the files as well as the result", async ({ page }) => {
  await page.goto("/merge-pdf");
  await page.setInputFiles('input[type="file"]', [fixture("text-2p.pdf"), fixture("text-3p.pdf")]);
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(page.getByRole("link", { name: "Download merged PDF" })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("button", { name: "Back to options" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("button", { name: "Choose PDF files" })).toBeVisible();
  await expect(page.getByText("text-2p.pdf")).toHaveCount(0);
});

test("compress: a size link under the tool takes the chosen file along", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  await page.goto("/compress-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByText("text-2p.pdf")).toBeVisible();
  const sizes = () => page.getByRole("region", { name: "Compress to a specific size" });

  await sizes().getByRole("link", { name: "200 KB" }).click();
  await expect(page).toHaveURL(/\/compress-pdf-to-200kb$/);
  await expect(page.getByText("text-2p.pdf")).toBeVisible();
  await expect(page.getByText("Carried over from Compress PDF.")).toBeVisible();
  await expect(page.getByLabel("Target size")).toBeChecked();
  await expect(page.getByRole("combobox")).toHaveValue(String(200 * 1024));

  // From one size page to another, which is the same route with another address.
  await sizes().getByRole("link", { name: "1 MB" }).click();
  await expect(page).toHaveURL(/\/compress-pdf-to-1mb$/);
  await expect(page.getByText("text-2p.pdf")).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveValue(String(1024 * 1024));

  // The file is handed over once: leaving by another link and coming back starts empty.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Merge" }).click();
  await expect(page).toHaveURL(/\/merge-pdf$/);
  await expect(page.getByText("text-2p.pdf")).toHaveCount(0);
  expect(outside).toEqual([]);
});

test("questions: the whole row opens the answer, not only its line of text", async ({ page }) => {
  await page.goto("/merge-pdf");
  const row = page.locator("details", { hasText: "Are my files uploaded?" });
  const summary = row.locator("summary");
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await summary.click({ position: { x: 4, y: 4 } }); // the corner of the row, well away from the words
  await expect(row).toHaveAttribute("open", "");
  // The opposite corner closes it again: the answer below must not lie over the row's lower edge.
  const open = (await summary.boundingBox())!;
  expect(open.height).toBeGreaterThanOrEqual(44);
  await summary.click({ position: { x: open.width - 4, y: open.height - 4 } });
  await expect(row).not.toHaveAttribute("open", "");
});

test("home: the sizes come most-searched first, and the promise to check it yourself links to the page that shows how", async ({ page }) => {
  await page.goto("/");
  // Not by size, on purpose (see COMPRESS_SIZES in lib/tools.ts): the same order in the page and in the footer.
  const inOrder = ["1 MB", "2 MB", "5 MB", "200 KB", "100 KB", "500 KB", "10 MB", "4 MB", "300 KB"];
  expect(await page.locator("main a.pill-link").allTextContents()).toEqual(inOrder);
  expect(await page.getByRole("navigation", { name: "Compress to a size" }).getByRole("link").allTextContents()).toEqual(inOrder);
  // On a computer the footer's lists stand open in columns; the folded version is for phones (tests/mobile.spec.ts).
  await expect(page.getByRole("contentinfo").locator("summary").first()).toBeHidden();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Sign PDF" })).toBeVisible();
  await page.locator("main").getByRole("link", { name: "how-it-works page" }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
});

test("the groups of tools: Compress comes second, on the home page and in the menu", async ({ page }) => {
  await page.goto("/");
  // The order is CATEGORIES in lib/tools.ts. The footer has its own, chosen so its columns pack (see Footer.tsx).
  const inOrder = ["Merge, split and organise", "Compress", "Convert to PDF", "Convert from PDF", "Edit", "Security"];
  // The groups' own headings (each group section is labelled cat-<id>), not every heading on the page.
  expect(await page.locator('main section[aria-labelledby^="cat-"] h2').allTextContents()).toEqual(inOrder);
  await page.getByRole("button", { name: "All tools" }).click();
  expect(await page.locator("#all-tools h2").allTextContents()).toEqual([...inOrder, "About"]);
});

test("every page loads without console errors or policy violations", async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ["/", "/merge-pdf", "/compress-pdf", "/delete-pdf-pages", "/extract-pdf-pages", "/compress-pdf-to-5mb", "/how-it-works"]) {
    await page.goto(path, { waitUntil: "networkidle" });
  }
  expect(errors).toEqual([]);
});
