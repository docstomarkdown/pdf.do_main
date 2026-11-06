import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Component gallery" })).toBeVisible();
});

test("the gallery fits a phone without sideways scrolling", async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("on a phone the dialog is a sheet from the bottom edge, and can be dismissed", async ({ page }) => {
  await page.getByRole("region", { name: "Dialog", exact: true }).locator('[data-scheme="light"]').getByRole("button", { name: "Open the dialog" }).tap();
  const dialog = page.getByRole("dialog", { name: "This file needs a password" });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.round(box.width)).toBe(viewport.width);
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  await dialog.getByRole("button", { name: "Cancel" }).tap();
  await expect(dialog).toBeHidden();
});

test("on a phone the main controls can be tapped (44 px)", async ({ page }) => {
  const choices = page.getByRole("region", { name: "Buttons and choices", exact: true }).locator('[data-scheme="light"]');
  for (const name of ["Move up", "1 MB", "Medium"]) {
    const box = (await choices.getByRole("button", { name }).first().boundingBox())!;
    expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
  }
});

test("on a phone the page stage draws, fits, and the mark moves with the buttons", async ({ page }) => {
  const area = page.getByRole("region", { name: "Page stage: preview and placement", exact: true }).locator('[data-scheme="light"]');
  await expect(area.getByTestId("page-canvas")).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });
  const canvas = (await area.getByTestId("page-canvas").boundingBox())!;
  expect(canvas.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await area.getByRole("radio", { name: "Top left" }).check({ force: true });
  await expect(area.getByTestId("mark-position")).toHaveText("Mark at 18%, 12%");
  await area.getByRole("button", { name: "Move down" }).tap();
  await expect(area.getByTestId("mark-position")).toHaveText("Mark at 18%, 14%");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("on a phone the results fit: each row keeps its download inside it, the ZIP button is full width, and the tiles sit two across", async ({ page }) => {
  const several = page.getByRole("region", { name: "Results: several files and a ZIP", exact: true }).locator('[data-scheme="light"]');
  await several.scrollIntoViewIfNeeded();
  const result = several.getByTestId("multi-result");
  const zip = result.getByRole("link", { name: /^Download all/ });
  await expect(zip).toBeVisible({ timeout: 30_000 });
  const panel = (await result.boundingBox())!;
  for (const row of await result.getByRole("listitem").all()) {
    const box = (await row.boundingBox())!;
    const link = (await row.getByRole("link").boundingBox())!;
    expect(link.x + link.width, "a row's download stays inside the row").toBeLessThanOrEqual(box.x + box.width + 1);
    expect(link.height).toBeGreaterThanOrEqual(40);
  }
  const bar = (await zip.boundingBox())!;
  expect(bar.height).toBeGreaterThanOrEqual(44);
  expect(bar.x + bar.width).toBeLessThanOrEqual(panel.x + panel.width + 1);

  const pictures = page.getByRole("region", { name: "Results: pictures", exact: true }).locator('[data-scheme="light"]');
  await pictures.scrollIntoViewIfNeeded();
  const tiles = pictures.locator(".imgtile");
  await expect(tiles).toHaveCount(3);
  const first = (await tiles.nth(0).boundingBox())!;
  const second = (await tiles.nth(1).boundingBox())!;
  expect(Math.abs(first.y - second.y), "two tiles share a row").toBeLessThan(2);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
