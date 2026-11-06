import { expect, test } from "@playwright/test";

// The component gallery is a development page. It must never be part of the production export that ships.
// (It is built only with GALLERY=1 or in `next dev`; see next.config.ts and tests-gallery/.)
test("the component gallery is not in the production export", async ({ page }) => {
  const response = await page.goto("/gallery");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Component gallery" })).toHaveCount(0);
});
