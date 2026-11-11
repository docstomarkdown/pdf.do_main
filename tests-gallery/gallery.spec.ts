import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { audit, watchErrors, watchOutbound } from "../tests/helpers";

const ORIGIN = "http://localhost:4175";
type Scheme = "light" | "dark";

/** One theme's panel inside one specimen, by the specimen's heading. */
const panel = (page: Page, specimen: string, scheme: Scheme) =>
  page.getByRole("region", { name: specimen, exact: true }).locator(`[data-scheme="${scheme}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Component gallery" })).toBeVisible();
});

test("the gallery loads with no console errors and no request outside our own origin", async ({ page, context }) => {
  const outside = watchOutbound(context, ORIGIN);
  const errors = watchErrors(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("both themes resolve: the dark panel is dark, the light panel is light, and buttons follow", async ({ page }) => {
  const bg = (scheme: Scheme) => panel(page, "Buttons and choices", scheme).evaluate((el) => getComputedStyle(el).backgroundColor);
  const primary = (scheme: Scheme) => panel(page, "Buttons and choices", scheme).locator(".btn-primary").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg("light")).toBe("rgb(255, 255, 255)");
  expect(await bg("dark")).toBe("rgb(16, 24, 41)"); // the card colour of the 2026-11-11 palette
  expect(await primary("light")).toBe("rgb(38, 112, 236)");
  expect(await primary("dark")).toBe("rgb(38, 112, 236)");
});

test("Google Sans is the page font and is served from our own origin", async ({ page }) => {
  const info = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => /Google Sans/.test(f.family));
    return { family: getComputedStyle(document.body).fontFamily, loaded: faces.filter((f) => f.status === "loaded").length, declared: faces.length };
  });
  expect(info.family).toMatch(/Google Sans/);
  expect(info.declared).toBeGreaterThan(0);
  expect(info.loaded).toBeGreaterThan(0);
});

test("accessibility: no WCAG A or AA violations, in both themes at once", async ({ page }) => {
  await audit(page, "the component gallery");
});

test("dialog: opens, keeps focus inside, closes on Escape and on the backdrop, and returns focus", async ({ page }) => {
  const opener = panel(page, "Dialog", "light").getByRole("button", { name: "Open the dialog" });
  const dialog = page.getByRole("dialog", { name: "This file needs a password" });

  // Opened from the keyboard: Safari does not focus a button when it is clicked, so only a keyboard open gives
  // the dialog something to return focus to in every browser.
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  // Tabbing forward and back never lands on the page behind the dialog, and that page cannot take focus.
  // (Focus may rest on the document itself: Safari's default tabs through text fields only, so focus then
  // leaves for the browser's own interface. What must never happen is focus on something behind the dialog.)
  const stray = () => page.evaluate(() => {
    const active = document.activeElement;
    return !active || active === document.body || active.closest("dialog") ? null : active.outerHTML.slice(0, 70);
  });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await stray()).toBeNull();
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await stray()).toBeNull();
  }
  expect(await opener.evaluate((el) => { el.focus(); return document.activeElement === el; })).toBe(false);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(4, 4); // the backdrop
  await expect(dialog).toBeHidden();
});

test("password field: shows and hides the password, and keeps what was typed", async ({ page }) => {
  const fields = panel(page, "Fields", "light");
  const input = fields.getByLabel("Password", { exact: true });
  await input.fill("s3cret");
  await expect(input).toHaveAttribute("type", "password");
  await fields.getByRole("button", { name: "Show password" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveValue("s3cret");
  await fields.getByRole("button", { name: "Hide password" }).click();
  await expect(input).toHaveAttribute("type", "password");
});

test("segmented choice: the arrow keys move the selection", async ({ page }) => {
  const choices = panel(page, "Buttons and choices", "light");
  await choices.getByRole("radio", { name: "Draw" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(choices.getByRole("radio", { name: "Type" })).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(choices.getByRole("radio", { name: "Upload" })).toBeChecked();
});

test("chips report whether they are pressed", async ({ page }) => {
  const choices = panel(page, "Buttons and choices", "light");
  await choices.getByRole("button", { name: "2 MB" }).click();
  await expect(choices.getByRole("button", { name: "2 MB" })).toHaveAttribute("aria-pressed", "true");
  await expect(choices.getByRole("button", { name: "1 MB" })).toHaveAttribute("aria-pressed", "false");
});

test("slider: the value is readable beside the label and follows the keyboard", async ({ page }) => {
  const fields = panel(page, "Fields", "light");
  const slider = fields.getByRole("slider");
  await expect(fields.getByText("40%")).toBeVisible();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(fields.getByText("42%")).toBeVisible();
});

test("disclosure: opens and closes from the keyboard", async ({ page }) => {
  const surfaces = panel(page, "Surfaces and messages", "light");
  const summary = surfaces.getByText("More options", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(surfaces.getByLabel("Resolution")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(surfaces.getByLabel("Resolution")).toBeHidden();
});

test("alert: dismiss removes it, and its action button is reachable", async ({ page }) => {
  const surfaces = panel(page, "Surfaces and messages", "light");
  await expect(surfaces.getByText("Carried over from Merge PDF.")).toBeVisible();
  await surfaces.getByRole("button", { name: "Dismiss" }).click();
  await expect(surfaces.getByText("Carried over from Merge PDF.")).toBeHidden();
  await expect(surfaces.getByRole("alert").filter({ hasText: "password-protected" }).getByRole("button", { name: "Enter password" })).toBeVisible();
});

test("tap targets: icon buttons, chips, choices and buttons are at least 44 px (small buttons 40)", async ({ page }) => {
  const choices = panel(page, "Buttons and choices", "light");
  const size = async (loc: ReturnType<typeof choices.locator>) => (await loc.first().boundingBox())!;
  const icon = await size(choices.getByRole("button", { name: "Move up" }));
  expect(icon.width).toBeGreaterThanOrEqual(44);
  expect(icon.height).toBeGreaterThanOrEqual(44);
  expect((await size(choices.getByRole("button", { name: "1 MB" }))).height).toBeGreaterThanOrEqual(44);
  expect((await size(choices.locator(".seg-label").first())).height).toBeGreaterThanOrEqual(44);
  expect((await size(choices.getByRole("button", { name: "Medium" }))).height).toBeGreaterThanOrEqual(44);
  expect((await size(choices.getByRole("button", { name: "Large" }))).height).toBeGreaterThanOrEqual(56);
  expect((await size(choices.getByRole("button", { name: "Small" }))).height).toBeGreaterThanOrEqual(40);
});

test.describe("notifier", () => {
  test("loads on the first notification, not before", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (r) => { if (r.resourceType() === "script") scripts.push(r.url()); });
    await page.waitForLoadState("networkidle");
    const before = scripts.length;
    await page.getByRole("button", { name: "Status toast" }).click();
    await expect(page.getByText("3 files added")).toBeVisible();
    expect(scripts.length).toBeGreaterThan(before);
  });

  test("status: announces itself, can be dismissed, and clears after five seconds", async ({ page }) => {
    await page.getByRole("button", { name: "Status toast" }).click();
    const toast = page.locator(".toast").filter({ hasText: "3 files added" });
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("role", "status");
    await expect(page.getByRole("region", { name: /Notifications/ })).toBeAttached();
    await expect(toast).toBeHidden({ timeout: 8000 });

    await page.getByRole("button", { name: "Status toast" }).click();
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    await expect(page.locator(".toast")).toHaveCount(0);
  });

  test("error: is an alert, stays past five seconds, and its action closes it", async ({ page }) => {
    await page.getByRole("button", { name: "Error toast" }).click();
    const toast = page.getByRole("alert").filter({ hasText: "receipts.pdf could not be read" });
    await expect(toast).toBeVisible();
    await page.waitForTimeout(6000);
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Remove it" }).click();
    await expect(toast).toBeHidden();
  });

  test("progress: updates, then becomes a confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Progress toast" }).click();
    await expect(page.getByText("Downloading the language data")).toBeVisible();
    await expect(page.getByText("Language data ready")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Downloading the language data")).toBeHidden();
  });

  test("progress: Cancel stops it and says so", async ({ page }) => {
    await page.getByRole("button", { name: "Progress toast" }).click();
    await page.locator(".toast").filter({ hasText: "Downloading the language data" }).getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Download cancelled")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.getByText("Language data ready")).toHaveCount(0);
  });

  test("accessibility: no WCAG A or AA violations while a status, an error and a progress toast are on screen", async ({ page }) => {
    await page.getByRole("button", { name: "Status toast" }).click();
    await page.getByRole("button", { name: "Error toast" }).click();
    await page.getByRole("button", { name: "Progress toast" }).click();
    await expect(page.locator(".toast")).toHaveCount(3);
    await page.waitForTimeout(1000); // let the toasts finish sliding in: axe reads colours mid-animation otherwise
    await audit(page, "the gallery with toasts showing");
  });

  test("at most three are visible at once", async ({ page }) => {
    for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Error toast" }).click();
    await expect(page.locator('[data-sonner-toast][data-visible="true"]')).toHaveCount(3);
  });

  test("toasts follow the page scheme", async ({ page }) => {
    await page.getByRole("radio", { name: "Dark" }).check({ force: true });
    await page.getByRole("button", { name: "Status toast" }).click();
    const toast = page.locator(".toast").filter({ hasText: "3 files added" });
    await expect(toast).toBeVisible();
    expect(await toast.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(24, 34, 58)");
  });
});

test.describe("tool blocks", () => {
  const files = (page: Page) => panel(page, "Tool blocks: files and pages", "light");
  const running = (page: Page) => panel(page, "Tool blocks: running and result", "light");

  test("file list: says what each file is, and moves and removes rows with buttons", async ({ page }) => {
    const list = files(page);
    await expect(list.getByText("3 pages · 210 KB")).toBeVisible();
    await expect(list.getByText("Reading…")).toBeVisible();
    await expect(list.getByText("This PDF is password-protected.")).toBeVisible();
    await expect(list.getByRole("button", { name: "Move invoice-march.pdf up" })).toBeDisabled();
    await list.getByRole("button", { name: "Move receipts.pdf up" }).click();
    await expect(list.getByRole("button", { name: "Move receipts.pdf up" })).toBeDisabled();
    await list.getByRole("button", { name: "Remove contract.pdf" }).click();
    await expect(list.getByText("contract.pdf")).toHaveCount(0);
  });

  test("file card: the replace button is off while work is under way", async ({ page }) => {
    const replace = files(page).getByRole("button", { name: "Choose a different file" });
    await expect(replace.first()).toBeEnabled();
    await expect(replace.nth(1)).toBeDisabled();
  });

  test("range field and selection tools", async ({ page }) => {
    const area = files(page);
    const field = area.getByLabel("Pages to delete");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(area.getByText("Pages go from 1 to 3.")).toBeVisible();
    await field.fill("2");
    await expect(area.getByText("Pages go from 1 to 3.")).toBeHidden();
    await area.getByRole("button", { name: "Invert" }).click();
    await expect(area.getByText("Last choice: inverted")).toBeVisible();
  });

  test("button loading: busy, inert, and still focusable", async ({ page }) => {
    const busy = running(page).getByRole("button", { name: "Compressing…" });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toHaveAttribute("aria-disabled", "true");
    await busy.focus();
    await expect(busy).toBeFocused();
  });

  test("job progress: names the stages, reports the fraction, and can be cancelled", async ({ page }) => {
    const area = running(page);
    await expect(area.getByText("Optimising structure and images…")).toBeVisible();
    await expect(area.getByText("Packaging")).toBeVisible();
    await expect(area.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "62");
    await area.getByRole("button", { name: "Cancel" }).first().click();
    await expect(area.getByText("Cancelled.")).toBeVisible();
  });

  test("action bar: sticky on a narrow container, inline on a wide one", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 }); // the panels stack, each about 700 px wide
    const bar = () => running(page).locator(".actionbar").first().evaluate((el) => getComputedStyle(el).position);
    expect(await bar()).toBe("static");
    await page.getByRole("radio", { name: "320" }).check({ force: true });
    expect(await bar()).toBe("sticky");
  });

  test("result panel: takes focus, offers the download and the next tools, and starts over", async ({ page }) => {
    const area = running(page);
    await area.getByRole("button", { name: "Show the result panel" }).click();
    const result = page.getByTestId("gallery-result").first();
    await expect(result).toBeFocused();
    const download = result.getByRole("link", { name: "Download compressed PDF" });
    await expect(download).toHaveAttribute("download", "report-compressed.pdf");
    await expect(result.getByRole("button", { name: "Merge PDF" })).toBeVisible();
    await result.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByTestId("gallery-result")).toHaveCount(0);
  });

  test("a crash inside a tool is caught, with an honest message", async ({ page }) => {
    const area = panel(page, "Empty and crash states", "light");
    await expect(area.getByText("No files yet")).toBeVisible();
    await area.getByRole("button", { name: "Break this tool" }).click();
    const alert = area.getByRole("alert");
    await expect(alert).toContainText("This tool hit a problem.");
    await expect(alert).toContainText("Your file was not uploaded or changed.");
    await expect(alert.getByRole("button", { name: "Reload the page" })).toBeVisible();
  });

  test("accessibility: no violations with the result panel and the crash state showing", async ({ page }) => {
    await running(page).getByRole("button", { name: "Show the result panel" }).click();
    await panel(page, "Empty and crash states", "light").getByRole("button", { name: "Break this tool" }).click();
    await page.waitForTimeout(500);
    await audit(page, "the gallery with a result and a crash showing");
  });
});

test.describe("page stage", () => {
  const stage = (page: Page) => panel(page, "Page stage: preview and placement", "light");
  const grid = (page: Page) => panel(page, "Page stage: page grid", "light");
  const drawn = (page: Page) => stage(page).getByTestId("page-canvas");

  test("page preview: draws the real page, turns pages and zooms", async ({ page }) => {
    const area = stage(page);
    await expect(drawn(page)).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });
    const ink = await drawn(page).evaluate((canvas: HTMLCanvasElement) => {
      const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let dark = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 128) dark++;
      return dark;
    });
    expect(ink).toBeGreaterThan(200); // the text of the page, not a blank sheet

    await expect(area.getByText("Page 1 of 4")).toBeVisible();
    await expect(area.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await area.getByRole("button", { name: "Next page" }).click();
    await expect(area.getByText("Page 2 of 4")).toBeVisible();
    await expect(drawn(page)).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });

    const width = async () => (await drawn(page).boundingBox())!.width;
    const before = await width();
    await area.getByRole("button", { name: "Zoom in" }).click();
    await expect.poll(width).toBeGreaterThan(before * 1.3);
    await area.getByRole("button", { name: "Zoom out" }).click();
    await expect.poll(width).toBeLessThan(before * 1.1);
    await expect(area.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });

  test("placement: drag, position grid, nudge buttons, arrow keys, and undo and redo", async ({ page }) => {
    const area = stage(page);
    const readout = area.getByTestId("mark-position");
    const mark = area.getByRole("group", { name: "Watermark" });
    await expect(readout).toHaveText("Mark at 50%, 50%");
    await expect(drawn(page)).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });

    // Drag it by hand: it moves, and no position on the grid is selected any more.
    await mark.scrollIntoViewIfNeeded(); // mouse coordinates are the viewport's, so the mark must be on screen
    const box = (await mark.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
    await expect(readout).not.toHaveText("Mark at 50%, 50%");
    await expect(area.getByRole("radio", { checked: true })).toHaveCount(0);

    // The position grid snaps it, a nudge button moves it a step, the arrow keys move it too.
    await area.getByRole("radio", { name: "Bottom right" }).check({ force: true });
    await expect(readout).toHaveText("Mark at 82%, 88%");
    await area.getByRole("button", { name: "Move left" }).click();
    await expect(readout).toHaveText("Mark at 80%, 88%");
    await mark.focus();
    await page.keyboard.press("ArrowUp");
    await expect(readout).toHaveText("Mark at 80%, 86%");
    await page.keyboard.press("Shift+ArrowUp");
    await expect(readout).toHaveText("Mark at 80%, 76%");

    // Undo steps back through the finished changes, one at a time; redo goes forward again.
    await area.getByRole("button", { name: "Undo" }).click();
    await expect(readout).toHaveText("Mark at 80%, 86%");
    await area.getByRole("button", { name: "Undo" }).click();
    await expect(readout).toHaveText("Mark at 80%, 88%");
    await area.getByRole("button", { name: "Redo" }).click();
    await expect(readout).toHaveText("Mark at 80%, 86%");
  });

  test("resizing a stamp: the corner handle and the plus and minus keys", async ({ page }) => {
    const area = stage(page);
    const readout = area.getByTestId("stamp-size");
    await expect(readout).toHaveText("Stamp 24%");
    await area.getByRole("group", { name: "Stamp" }).focus();
    await page.keyboard.press("+");
    await expect(readout).toHaveText("Stamp 26%");
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await expect(readout).toHaveText("Stamp 22%");
    await area.getByTestId("resize-handle").scrollIntoViewIfNeeded();
    const handle = (await area.getByTestId("resize-handle").boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(readout).not.toHaveText("Stamp 22%");
  });

  test("opacity slider: one undo step for one change, however long the drag", async ({ page }) => {
    const area = stage(page);
    const slider = area.getByRole("slider");
    await slider.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await slider.blur();
    await expect(area.getByText("45%")).toBeVisible();
    await area.getByRole("button", { name: "Undo" }).click();
    await expect(area.getByText("40%")).toBeVisible();
    await area.getByRole("button", { name: "Redo" }).click();
    await expect(area.getByText("45%")).toBeVisible();

    // Undo while a change is still in progress (Safari does not move focus when a button is clicked): back to where it began.
    await slider.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect(area.getByText("48%")).toBeVisible();
    await area.getByRole("button", { name: "Undo" }).dispatchEvent("click");
    await expect(area.getByText("45%")).toBeVisible();
  });

  test("page grid: thumbnails, then move, turn, delete and undo with buttons", async ({ page }) => {
    const area = grid(page);
    const order = area.getByTestId("grid-order");
    await expect(order).toHaveText("Order: 1, 2, 3, 4");
    await order.scrollIntoViewIfNeeded(); // thumbnails are only asked for once the grid is near the screen
    await expect(area.locator(".thumb-paper img").first()).toBeVisible({ timeout: 30_000 });
    await expect(area.getByRole("button", { name: "Move earlier" })).toBeEnabled();

    await area.getByRole("button", { name: "Move later" }).click();
    await expect(order).toHaveText("Order: 1, 3, 2, 4");
    await area.getByRole("button", { name: "Rotate" }).click();
    await expect(area.locator(".thumb-paper img").nth(2)).toHaveAttribute("style", /rotate\(90deg\)/);
    await area.getByRole("button", { name: "Delete page" }).click();
    await expect(order).toHaveText("Order: 1, 3, 4");
    await area.getByRole("button", { name: "Undo" }).click();
    await expect(order).toHaveText("Order: 1, 3, 2, 4");

    await area.getByRole("radio", { name: "Page 1" }).check({ force: true });
    await expect(area.getByRole("button", { name: "Move earlier" })).toBeDisabled();
  });

  test("page grid: the last page cannot be deleted", async ({ page }) => {
    const area = grid(page);
    await expect(area.getByTestId("grid-order")).toHaveText("Order: 1, 2, 3, 4");
    for (let i = 0; i < 3; i++) await area.getByRole("button", { name: "Delete page" }).click();
    await expect(area.getByTestId("grid-order")).toHaveText("Order: 1");
    await expect(area.getByRole("button", { name: "Delete page" })).toBeDisabled();
  });

  test("accessibility: no violations with the page drawn and the marks on it", async ({ page }) => {
    await expect(drawn(page)).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });
    await grid(page).getByTestId("grid-order").scrollIntoViewIfNeeded();
    await expect(grid(page).locator(".thumb-paper img").first()).toBeVisible({ timeout: 30_000 });
    await audit(page, "the gallery with the page stage drawn");
  });
});

test.describe("results", () => {
  const several = (page: Page, scheme: Scheme = "light") => panel(page, "Results: several files and a ZIP", scheme);
  const pictures = (page: Page) => panel(page, "Results: pictures", "light");
  const text = (page: Page, scheme: Scheme = "light") => panel(page, "Results: text", scheme);
  const report = (page: Page, scheme: Scheme = "light") => panel(page, "Results: report", scheme);
  const read = async (download: { path: () => Promise<string | null> }) => new Uint8Array(fs.readFileSync((await download.path())!));
  const kb = (label: string | null) => parseFloat(/ZIP, ([\d.]+)\sKB\)/.exec(label ?? "")![1]); // the unit sits after a non-breaking space

  test("several files: each row downloads its own real file", async ({ page }) => {
    await several(page).scrollIntoViewIfNeeded(); // the specimen builds itself when it comes near the screen
    const result = several(page).getByTestId("multi-result");
    await expect(result.getByRole("listitem")).toHaveCount(3);
    const link = result.getByRole("link", { name: "Download invoice-part-1.pdf" });
    await expect(link).toHaveAttribute("href", /^blob:/);
    const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
    expect(download.suggestedFilename()).toBe("invoice-part-1.pdf");
    expect(Buffer.from(await read(download)).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("several files: one ZIP that names its size and holds exactly those files", async ({ page }) => {
    await several(page).scrollIntoViewIfNeeded();
    const result = several(page).getByTestId("multi-result");
    const zip = result.getByRole("link", { name: /^Download all \(ZIP, [\d.]+ KB\)$/ });
    await expect(zip).toBeVisible({ timeout: 30_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), zip.click()]);
    expect(download.suggestedFilename()).toBe("invoice-split.zip");
    const bytes = await read(download);
    // The size on the button is the size of the file saved.
    expect(Math.abs(kb(await zip.textContent()) * 1024 - bytes.length)).toBeLessThan(100);
    const entries = unzipSync(bytes);
    expect(Object.keys(entries).sort()).toEqual([
      "annual-report-2025-final-signed-version-with-appendix-part-3-of-12.pdf", "invoice-part-1.pdf", "invoice-part-2.pdf",
    ]);
    for (const data of Object.values(entries)) expect(Buffer.from(data).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("several files: too big to bundle says so, and a single file gets no ZIP", async ({ page }) => {
    const area = several(page);
    await area.scrollIntoViewIfNeeded();
    await expect(area.getByText(/These 3 files add up to .* too much to bundle on this device/)).toBeVisible();
    await expect(area.getByRole("link", { name: /Download all/ })).toHaveCount(1); // the panel's own, and no other
  });

  test("several files: when the ZIP cannot be made, the files can still be downloaded", async ({ page }) => {
    await page.route("**/engines/zip.worker.js", (route) => route.abort());
    await page.goto("/gallery");
    const area = several(page);
    await area.scrollIntoViewIfNeeded();
    await expect(area.getByRole("alert").filter({ hasText: "The ZIP could not be made" })).toBeVisible({ timeout: 20_000 });
    await expect(area.getByTestId("multi-result").getByRole("link", { name: "Download invoice-part-2.pdf" })).toHaveAttribute("href", /^blob:/);
  });

  test("pictures: tiles load, a tile opens a larger view and gives focus back, and the ZIP holds the pictures", async ({ page }) => {
    const area = pictures(page);
    await area.scrollIntoViewIfNeeded();
    const images = area.locator(".imgtile img");
    await expect(images).toHaveCount(3);
    await expect.poll(() => images.evaluateAll((list) => list.every((i) => (i as HTMLImageElement).naturalWidth > 0)), { timeout: 20_000 }).toBe(true);

    const open = area.getByRole("button", { name: "View Page 2 larger" });
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Page 2" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: "Page 2" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();

    const [save] = await Promise.all([page.waitForEvent("download"), area.getByRole("link", { name: "Download Page 3" }).click()]);
    expect(save.suggestedFilename()).toBe("page-3.jpg");
    expect(Array.from((await read(save)).subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]); // a real JPEG

    const zip = area.getByRole("link", { name: /^Download all \(ZIP, [\d.]+ KB\)$/ });
    await expect(zip).toBeVisible({ timeout: 30_000 });
    const [all] = await Promise.all([page.waitForEvent("download"), zip.click()]);
    expect(Object.keys(unzipSync(await read(all))).sort()).toEqual(["page-1.jpg", "page-2.jpg", "page-3.jpg"]);
  });

  test("text: shown, labelled and focusable, copies, and downloads the whole text", async ({ page, browserName }) => {
    const area = text(page);
    const box = area.getByRole("region", { name: "Extracted text", exact: true });
    await box.scrollIntoViewIfNeeded();
    await expect(box).toContainText("Revenue grew in the second half");
    await box.focus();
    await expect(box).toBeFocused();

    // The links carry the right name and a file made here. The real download, with its contents, is watched in Chromium only:
    // Playwright's WebKit sometimes misses the download event for a text file (about one run in eight; never for PDF, JPEG
    // or ZIP), and the page's content-security policy rightly forbids reading a blob address back with fetch.
    const first = area.getByRole("link", { name: "Download .txt" }).first();
    const second = area.getByRole("link", { name: "Download .txt" }).nth(1);
    await expect(first).toHaveAttribute("download", "summary.txt");
    await expect(first).toHaveAttribute("href", /^blob:/);
    await expect(second).toHaveAttribute("download", "long.txt");
    await expect(second).toHaveAttribute("href", /^blob:/);
    if (browserName === "chromium") {
      const [download] = await Promise.all([page.waitForEvent("download"), first.click()]);
      expect(download.suggestedFilename()).toBe("summary.txt");
      expect(Buffer.from(await read(download)).toString()).toContain("Outlook: stable, with one open risk in supply.");
      const [all] = await Promise.all([page.waitForEvent("download"), second.click()]);
      expect(Buffer.from(await read(all)).toString()).toContain("Line 400:"); // the whole text, not only what is shown
    }

    // The long text shows its first part and says so.
    const long = area.getByRole("region", { name: "Extracted text, long" });
    expect((await long.textContent())!.length).toBe(2000);
    await expect(area.getByText("Showing the first 2,000 of 28,691 characters. Copy and Download include all of it.")).toBeVisible();

    // Copy: the label turns to Copied, a toast says so, then it goes back. Only Chromium lets a test read the clipboard, and
    // Playwright's WebKit sometimes refuses the write, in which case the button must say so (the next test covers that path).
    if (browserName === "chromium") await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const copy = area.getByRole("button", { name: "Copy text" }).first();
    await copy.click();
    const copied = area.getByRole("button", { name: "Copied" });
    const refused = page.getByRole("alert").filter({ hasText: "Could not copy" });
    await expect(copied.or(refused)).toBeVisible();
    if (await copied.isVisible()) {
      await expect(page.locator(".toast").filter({ hasText: "Copied to the clipboard" })).toBeVisible();
      if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Outlook: stable, with one open risk in supply.");
      await expect(area.getByRole("button", { name: "Copy text" }).first()).toBeVisible({ timeout: 4000 });
    } else {
      expect(browserName).toBe("webkit"); // Chromium has the permission, so a refusal there is a real fault
    }
  });

  test("text: when the browser refuses to copy, it says so and does not claim success", async ({ page }) => {
    await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) }, configurable: true }); });
    const area = text(page);
    await area.getByRole("button", { name: "Copy text" }).first().scrollIntoViewIfNeeded();
    await area.getByRole("button", { name: "Copy text" }).first().click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not copy" })).toBeVisible();
    await expect(area.getByRole("button", { name: "Copied" })).toHaveCount(0);
  });

  test("report: every finding has a word on its badge, the facts are pairs, and the bar is also a list that adds up", async ({ page }) => {
    const area = report(page);
    const findings = area.getByRole("list", { name: "Privacy scan" });
    await findings.scrollIntoViewIfNeeded();
    await expect(findings.getByRole("listitem")).toHaveCount(4);
    await expect(findings.getByRole("listitem").nth(1)).toContainText("Found");
    await expect(findings.getByRole("listitem").nth(1)).toContainText("GPS location");
    await expect(findings.getByRole("listitem").nth(2)).toContainText("Clear");

    const facts = area.getByRole("list", { name: "About this file" }).or(area.locator("dl[aria-label='About this file']"));
    await expect(facts.locator("dt")).toHaveText(["Pages", "Created with", "Size", "A long value"]);

    const legend = area.getByRole("list", { name: "What takes the space" });
    await expect(legend.getByRole("listitem")).toHaveCount(5);
    await expect(legend.getByRole("listitem").first()).toContainText("Images");
    const shares = await legend.getByRole("listitem").evaluateAll((items) => items.map((li) => parseInt(/(\d+)%/.exec(li.textContent ?? "")![1], 10)));
    expect(shares.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(99);
    expect(shares.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(101);
    // The bar is a picture only, and the smallest part still shows.
    expect(await area.locator(".seg-bar").getAttribute("aria-hidden")).toBe("true");
    expect(await area.locator(".seg-bar > i").last().evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(3);
  });

  test("the segment colours differ from one another and follow the theme", async ({ page }) => {
    const colours = async (scheme: Scheme) => report(page, scheme).locator(".seg-bar > i").evaluateAll((list) => list.map((el) => getComputedStyle(el).backgroundColor));
    const light = await colours("light");
    const dark = await colours("dark");
    expect(new Set(light).size).toBe(5);
    expect(new Set(dark).size).toBe(5);
    expect(light).not.toEqual(dark);
  });

  test("accessibility: no violations with the results blocks and their dialog open", async ({ page }) => {
    await several(page).scrollIntoViewIfNeeded();
    await pictures(page).scrollIntoViewIfNeeded();
    await expect(pictures(page).locator(".imgtile img")).toHaveCount(3);
    await expect(several(page).getByRole("link", { name: /^Download all/ })).toBeVisible({ timeout: 30_000 });
    await expect(pictures(page).getByRole("link", { name: /^Download all/ })).toBeVisible({ timeout: 30_000 });
    for (const scheme of ["light", "dark"] as Scheme[]) await expect(report(page, scheme).getByRole("list", { name: "Privacy scan" })).toBeVisible();
    await audit(page, "the gallery with the results blocks");
    // The enlarged picture inside its dialog, too.
    await pictures(page).getByRole("button", { name: "View Page 1 larger" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Page 1" })).toBeVisible();
    await audit(page, "the picture dialog");
  });
});

test("no sideways scroll at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Component gallery" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
