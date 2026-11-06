import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { audit, fixture, watchErrors, watchOutbound } from "./helpers";

// What has to be true before the site is shown to the public: the licences are listed, the tools say plainly what they cannot
// open, and a file that is too big for a browser tab is refused instead of crashing it.

test("licences: the font with its licence text, and every package that ships, with its licence", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/licences");
  await expect(page.getByRole("heading", { level: 1, name: "Licences" })).toBeVisible();
  await expect(page.locator("p", { hasText: "The text on this site is set in Google Sans, copyright 2025 The Google Sans Project Authors" })).toBeVisible();
  await page.getByText("SIL Open Font License, Version 1.1: the full text").click();
  await expect(page.getByText("SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007")).toBeVisible();
  await expect(page.getByText(/must not be\s+distributed under any other license/)).toBeVisible();

  const table = page.getByTestId("licence-table");
  for (const name of ["@cantoo/pdf-lib", "pdfjs-dist", "@neslinesli93/qpdf-wasm", "fflate", "signature_pad", "diff", "lucide-react", "sonner", "next", "react"]) {
    await expect(table.getByRole("rowheader", { name, exact: true }), name).toBeVisible();
  }
  const licences = await table.locator("tbody tr").evaluateAll((rows) => rows.map((r) => r.lastElementChild!.textContent ?? ""));
  expect(licences.length).toBeGreaterThan(10);
  for (const licence of licences) expect(licence, "a copyleft licence must never ship").not.toMatch(/\b(AGPL|GPL|SSPL)\b/);
  await audit(page, "licences page");
  await page.getByRole("link", { name: "Licences" }).last().scrollIntoViewIfNeeded();
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);

  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Licences" })).toHaveAttribute("href", "/licences");
});

/** A PDF that opens freely but forbids printing, made with the site's own qpdf in the page. */
async function restrictedPdf(page: import("@playwright/test").Page): Promise<Buffer> {
  await page.goto("/");
  await page.addScriptTag({ url: "/engines/vendor/qpdf.js" });
  const plain = Array.from(fs.readFileSync(fixture("text-2p.pdf")));
  const out = await page.evaluate(async (arr) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qpdf = await (window as any).Module({ locateFile: () => "/engines/vendor/qpdf.wasm", print: () => {}, printErr: () => {} });
    qpdf.FS.writeFile("/in.pdf", new Uint8Array(arr));
    qpdf.callMain(["/in.pdf", "--encrypt", "", "owner-secret", "256", "--print=none", "--", "/out.pdf"]);
    return Array.from(qpdf.FS.readFile("/out.pdf") as Uint8Array);
  }, plain);
  return Buffer.from(out);
}

test("encrypted files: the tools say which of the two tools to use, not just that the file is protected", async ({ page }) => {
  const restricted = await restrictedPdf(page);
  await page.waitForLoadState("networkidle");
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', { name: "restricted.pdf", mimeType: "application/pdf", buffer: restricted });
  // pdf.js opens a file that has restrictions only, so the page shows its thumbnails; the engine is what refuses to rewrite it.
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Turn right" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "If it opens but forbids changes, use Unlock PDF first." })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "use Remove PDF password first" })).toBeVisible();
  await expect(page.getByText("Password support is not built yet")).toHaveCount(0);
});

test("big files: a warning over 50 MB, and a refusal over 300 MB", async ({ page }) => {
  await page.goto("/rotate-pdf");
  // A valid PDF with trailing padding, written to a file: Playwright refuses an in-memory upload over 50 MB.
  fs.mkdirSync("test-results", { recursive: true });
  const big = `test-results/big-${test.info().project.name}.pdf`;
  fs.writeFileSync(big, Buffer.concat([fs.readFileSync(fixture("text-3p.pdf")), Buffer.alloc(51 * 1024 * 1024)]));
  await page.setInputFiles('input[type="file"]', big);
  await expect(page.getByRole("alert").filter({ hasText: /This file is large \(51\.\d MB\)/ })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "a phone may close the tab" })).toBeVisible();
  await audit(page, "rotate, a large file chosen");

  await page.goto("/rotate-pdf");
  await page.evaluate(() => {
    const huge = new File([new ArrayBuffer(301 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" });
    const transfer = new DataTransfer();
    transfer.items.add(huge);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByRole("alert").filter({ hasText: /huge\.pdf is 301\.\d MB\. A browser tab cannot hold a file over 300\.0 MB safely/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose a PDF" })).toBeVisible(); // still at the start: nothing was opened
});
