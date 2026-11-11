import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { audit, download, fixture, pageCount, watchErrors, watchOutbound } from "./helpers";

// Add image to PDF, and the paper remover in Sign PDF. Saved files are read back with pdf.js: which pages carry a picture,
// how wide it is and where it sits. The first test also asserts no request left the origin and nothing was logged as an error.

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

/** A PNG drawn in the page, so the test needs no picture file: a solid block, 200 by 100. */
async function blockPng(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 100;
    const x = c.getContext("2d")!;
    x.fillStyle = "#b91c1c";
    x.fillRect(0, 0, 200, 100);
    return c.toDataURL("image/png").split(",")[1];
  });
  return Buffer.from(base64, "base64");
}

/** A photo of a signature on paper: off-white paper with a soft shadow down one side and dark pen strokes. */
async function signaturePhoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 200;
    const x = c.getContext("2d")!;
    const paper = x.createLinearGradient(0, 0, 400, 0);
    paper.addColorStop(0, "#f3efe6");
    paper.addColorStop(1, "#dcd7cc"); // the shadow side
    x.fillStyle = paper;
    x.fillRect(0, 0, 400, 200);
    x.strokeStyle = "#1a2a6c";
    x.lineWidth = 6;
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(60, 120);
    x.bezierCurveTo(120, 20, 160, 190, 220, 90);
    x.bezierCurveTo(250, 40, 300, 160, 340, 100);
    x.stroke();
    return c.toDataURL("image/png").split(",")[1];
  });
  return Buffer.from(base64, "base64");
}

/**
 * The matrix in force at the first picture drawn on a page, or null when the page draws none: [width, 0, 0, height, x, y]
 * for an upright picture. pdf.js lists the drawing steps; the matrices in force at the picture are multiplied in order.
 */
async function firstPicture(file: string, pageNumber: number): Promise<number[] | null> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 });
  try {
    const list = await (await (await task.promise).getPage(pageNumber)).getOperatorList();
    const at = list.fnArray.findIndex((fn: number) => fn === pdfjs.OPS.paintImageXObject);
    if (at < 0) return null;
    const mul = (m: number[], n: number[]) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    let ctm = [1, 0, 0, 1, 0, 0];
    const saved: number[][] = [];
    for (let i = 0; i < at; i++) {
      const fn = list.fnArray[i];
      if (fn === pdfjs.OPS.save) saved.push(ctm);
      else if (fn === pdfjs.OPS.restore) ctm = saved.pop() ?? ctm;
      else if (fn === pdfjs.OPS.transform) ctm = mul(ctm, list.argsArray[i] as number[]);
    }
    return ctm;
  } finally {
    await task.destroy();
  }
}

/** The see-through value (0 to 255) of one pixel of the picture shown on the preview, at a point given in fractions of its size. */
async function alphaAt(page: Page, testId: string, fx: number, fy: number): Promise<number> {
  return page.getByTestId(testId).evaluate(async (el, [x, y]) => {
    const img = el as HTMLImageElement;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(Math.floor(x * (c.width - 1)), Math.floor(y * (c.height - 1)), 1, 1).data[3];
  }, [fx, fy]);
}

test("add image: choose a picture, place it with the grid, and find it on every page where the preview put it", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/add-image");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByRole("button", { name: "Add picture" })).toBeDisabled();
  await expect(page.getByText("Choose a picture first.")).toBeVisible();

  await page.locator('input[type="file"]').last().setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: await blockPng(page) });
  await expect(page.getByTestId("picture-preview")).toBeVisible();
  await expect(page.getByTestId("picture-name")).toContainText("logo.png");
  await page.getByRole("radio", { name: "Top left" }).check({ force: true });
  await expect(page.getByTestId("picture-position")).toHaveText("Centre at 18% across and 12% down, 30% of the page wide.");
  await audit(page, "add image, picture placed");

  await page.getByRole("radio", { name: "Every page" }).check({ force: true });
  await expect(page.getByText("On all 3 pages")).toBeVisible();
  await page.getByRole("button", { name: "Add picture" }).click();
  await expect(page.getByTestId("picture-count")).toHaveText("Picture added to 3 pages");
  const out = await download(page, "Download PDF with the picture");
  expect(await pageCount(out)).toBe(3);
  for (const n of [1, 2, 3]) {
    const m = (await firstPicture(out, n))!;
    expect(m, `page ${n} has the picture`).not.toBeNull();
    expect(m[0]).toBeCloseTo(0.3 * 595, 0); // 30% of the page's width
    expect(m[3]).toBeCloseTo(0.15 * 595, 0); // half as tall as wide, like the picture
    expect(m[4] + m[0] / 2).toBeCloseTo(0.18 * 595, 0); // centred 18% across
    expect(m[5] + m[3] / 2).toBeCloseTo(0.88 * 842, 0); // and 12% down from the top
  }
  await audit(page, "add image, result");
  noProblems(outside, errors);
});

test("add image: this page only, then chosen pages; a file that is not a picture is refused in words", async ({ page }) => {
  await page.goto("/add-image");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByText("Choose a picture first.")).toBeVisible(); // the PDF is open and the picture chooser is there
  const png = await blockPng(page);
  await page.locator('input[type="file"]').last().setInputFiles({ name: "stamp.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("picture-preview")).toBeVisible();

  // This page: page 2 only.
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("On page 2")).toBeVisible();
  await page.getByRole("button", { name: "Add picture" }).click();
  await expect(page.getByTestId("picture-count")).toHaveText("Picture added to 1 page");
  const one = await download(page, "Download PDF with the picture");
  expect(await firstPicture(one, 1)).toBeNull();
  expect(await firstPicture(one, 2)).not.toBeNull();
  expect(await firstPicture(one, 3)).toBeNull();

  // Chosen pages: 1 and 3.
  await page.getByRole("button", { name: "Back to options" }).click();
  await page.getByRole("radio", { name: "Chosen pages" }).check({ force: true });
  await page.getByLabel("Pages", { exact: true }).fill("1, 3");
  await expect(page.getByText("On 2 pages")).toBeVisible();
  await page.getByRole("button", { name: "Add picture" }).click();
  const two = await download(page, "Download PDF with the picture");
  expect(await firstPicture(two, 1)).not.toBeNull();
  expect(await firstPicture(two, 2)).toBeNull();
  expect(await firstPicture(two, 3)).not.toBeNull();

  // Not a picture.
  await page.goto("/add-image");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByText("Choose a picture first.")).toBeVisible();
  await page.locator('input[type="file"]').last().setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("this is not a picture") });
  await expect(page.getByText(/notes\.png could not be opened as a picture/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add picture" })).toBeDisabled();
});

test("sign: a photo of a signature loses its paper, the ink stays, and the amount can be changed or switched off", async ({ page }) => {
  await page.goto("/sign-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("radio", { name: "Upload" }).check({ force: true });
  await page.locator('input[type="file"]').last().setInputFiles({ name: "signature-photo.png", mimeType: "image/png", buffer: await signaturePhoto(page) });

  // On by default: the corners (paper, light and in shadow) are see-through and the pen stroke is solid.
  const remove = page.getByRole("checkbox", { name: "Remove the paper behind it" });
  await expect(remove).toBeChecked();
  await expect(page.getByTestId("signature-preview")).toBeVisible();
  await expect(page.getByText("The paper was taken out.")).toBeVisible();
  expect(await alphaAt(page, "signature-preview", 0, 0)).toBe(0);
  expect(await alphaAt(page, "signature-preview", 1, 1)).toBe(0);
  const size = await page.getByTestId("signature-preview").evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight]);
  expect(size[0]).toBeLessThan(400); // trimmed to the ink, so smaller than the photo
  expect(size[1]).toBeLessThan(200);
  // Somewhere in the picture the ink is solid.
  const solid = await page.getByTestId("signature-preview").evaluate(async (el) => {
    const img = el as HTMLImageElement;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let most = 0;
    for (let i = 3; i < data.length; i += 4) most = Math.max(most, data[i]);
    return most;
  });
  expect(solid).toBeGreaterThan(240);

  // Switched off: the photo is used as it is, paper and all.
  await remove.uncheck();
  await expect(page.getByText("The paper was taken out.")).toHaveCount(0);
  await expect.poll(() => alphaAt(page, "signature-preview", 0, 0)).toBe(255);

  // Back on, and it still signs the page.
  await remove.check();
  await expect.poll(() => alphaAt(page, "signature-preview", 0, 0)).toBe(0);
  await page.getByRole("button", { name: "Add signature" }).click();
  await expect(page.getByTestId("signed-count")).toHaveText("1 page signed");
  expect(await firstPicture(await download(page, "Download signed PDF"), 1)).not.toBeNull();
});

test("sign: a picture with nothing darker than its paper is used as it is, and the page says so", async ({ page }) => {
  await page.goto("/sign-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("radio", { name: "Upload" }).check({ force: true });
  await page.locator('input[type="file"]').last().setInputFiles({ name: "flat.png", mimeType: "image/png", buffer: await blockPng(page) });
  await expect(page.getByTestId("signature-preview")).toBeVisible();
  await expect(page.getByText("Nothing darker than the paper was found, so the picture is used as it is.")).toBeVisible();
  expect(await alphaAt(page, "signature-preview", 0.5, 0.5)).toBe(255);
});
