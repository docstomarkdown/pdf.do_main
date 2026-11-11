import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { PDFDocument, PDFCheckBox, PDFTextField, type PDFField } from "@cantoo/pdf-lib";
import { audit, download, fixture, watchErrors, watchOutbound } from "./helpers";

// Make PDF fillable. Saved files are read back with pdf-lib: the fields, their kinds, where each sits and on which page.
// The first test then opens the result in Fill PDF form and fills it in, and asserts no request left the origin.

const noProblems = (outside: string[], errors: string[]) => {
  expect(outside, "requests outside our own origin").toEqual([]);
  expect(errors, "console errors").toEqual([]);
};

/** Where a field sits on its page, in points from the bottom left. */
const boxOf = (field: PDFField) => field.acroField.getWidgets()[0].getRectangle();
/** How many fields (widgets) a page carries. */
const widgetsOn = (doc: PDFDocument, index: number) => doc.getPage(index).node.Annots()?.size() ?? 0;

test("make fillable: a text field, a tick box and a large field are added where the preview put them, and the result can be filled in", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/make-pdf-fillable");
  await page.setInputFiles('input[type="file"]', fixture("text-3p.pdf"));
  await expect(page.getByTestId("field-plan")).toHaveText("No fields yet.");
  await expect(page.getByRole("button", { name: "Add fields" })).toBeDisabled();

  await page.getByRole("button", { name: "Text field", exact: true }).click();
  await expect(page.getByLabel("Field name")).toHaveValue("Text 1");
  await page.getByLabel("Field name").fill("full_name");
  await expect(page.getByTestId("form-field")).toHaveText("full_name");
  await page.getByRole("radio", { name: "Top left" }).check({ force: true });

  await page.getByRole("button", { name: "Tick box" }).click();
  await expect(page.getByLabel("Field name")).toHaveValue("Tick 1");
  await page.getByLabel("Field name").fill("agree");
  await expect(page.getByTestId("field-count")).toHaveText("2 fields on page 1.");
  await audit(page, "make fillable, a field selected");

  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "Large text field" }).click();
  await expect(page.getByLabel("Field name")).toHaveValue("Notes 1");
  await expect(page.getByTestId("field-plan")).toHaveText("3 fields on 2 pages");

  await page.getByRole("button", { name: "Add fields" }).click();
  await expect(page.getByTestId("fields-done")).toHaveText("3 fields added on 2 pages");
  const out = await download(page, "Download fillable PDF");
  const doc = await PDFDocument.load(fs.readFileSync(out));
  const form = doc.getForm();
  expect(form.getFields().map((f) => f.getName()).sort()).toEqual(["Notes 1", "agree", "full_name"]);
  expect(form.getField("full_name")).toBeInstanceOf(PDFTextField);
  expect(form.getTextField("full_name").isMultiline()).toBe(false);
  expect(form.getTextField("Notes 1").isMultiline()).toBe(true);
  expect(form.getField("agree")).toBeInstanceOf(PDFCheckBox);

  // The text field: 34% of the page wide and 3% tall, centred 18% across and 12% down (the page is 595 by 842 points).
  const name = boxOf(form.getField("full_name"));
  expect(Math.abs(name.width - 0.34 * 595)).toBeLessThan(2);
  expect(Math.abs(name.height - 0.03 * 842)).toBeLessThan(2);
  expect(Math.abs(name.x + name.width / 2 - 0.18 * 595)).toBeLessThan(2);
  expect(Math.abs(name.y + name.height / 2 - 0.88 * 842)).toBeLessThan(2);
  // The tick box is square on the page.
  const tick = boxOf(form.getField("agree"));
  expect(Math.abs(tick.width - tick.height)).toBeLessThan(1.5);
  expect(Math.abs(tick.width - 0.03 * 595)).toBeLessThan(2);
  // Two fields on page 1, one on page 2, none on page 3.
  expect([widgetsOn(doc, 0), widgetsOn(doc, 1), widgetsOn(doc, 2)]).toEqual([2, 1, 0]);
  await audit(page, "make fillable, result");

  // The proof that it is a real form: fill it in with the site's own tool and read the values back.
  const made = `test-results/fillable-${test.info().project.name}.pdf`; // a download has no .pdf name, which the file chooser needs
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(out, made);
  await page.goto("/fill-pdf-form");
  await page.setInputFiles('input[type="file"]', made);
  await expect(page.getByTestId("form-count")).toHaveText("3 fields found.");
  await page.getByLabel("full_name").fill("Asha Rao");
  await page.getByRole("checkbox", { name: "agree" }).check();
  await page.getByLabel("Notes 1").fill("First line\nSecond line");
  await page.getByRole("button", { name: "Save filled PDF" }).click();
  const filled = (await PDFDocument.load(fs.readFileSync(await download(page, "Download filled PDF")))).getForm();
  expect(filled.getTextField("full_name").getText()).toBe("Asha Rao");
  expect(filled.getCheckBox("agree").isChecked()).toBe(true);
  expect(filled.getTextField("Notes 1").getText()).toBe("First line\nSecond line");
  noProblems(outside, errors);
});

test("make fillable: a name that is empty, has a full stop, is used twice or is already in the PDF is refused before anything runs", async ({ page }) => {
  // A PDF that already has a field called "email".
  const source = await PDFDocument.create();
  const first = source.addPage([595, 842]);
  source.getForm().createTextField("email").addToPage(first, { x: 60, y: 700, width: 200, height: 22 });
  const buffer = Buffer.from(await source.save());

  await page.goto("/make-pdf-fillable");
  await page.setInputFiles('input[type="file"]', { name: "has-a-field.pdf", mimeType: "application/pdf", buffer });
  await page.getByRole("button", { name: "Text field", exact: true }).click();
  const name = page.getByLabel("Field name");
  const add = page.getByRole("button", { name: "Add fields" });
  await expect(add).toBeEnabled();

  await name.fill("");
  await expect(page.getByText("Give the field a name.")).toBeVisible();
  await expect(add).toBeDisabled();
  await name.fill("a.b");
  await expect(page.getByText("A field name cannot have a full stop in it.")).toBeVisible();
  await expect(add).toBeDisabled();
  await name.fill("email");
  await expect(page.getByText("This PDF already has a field with that name.")).toBeVisible();
  await expect(add).toBeDisabled();

  await name.fill("phone");
  await expect(add).toBeEnabled();
  await page.getByRole("button", { name: "Tick box" }).click();
  await page.getByLabel("Field name").fill("phone");
  await expect(page.getByText("Another field has that name. Every field needs its own.")).toBeVisible();
  await expect(add).toBeDisabled();
  await expect(page.getByTestId("field-plan")).toHaveText("Fix the name of “phone” first.");

  // Remove the clashing tick box; the file keeps its own field and gains one.
  await page.getByRole("button", { name: "Remove this field" }).click();
  await expect(add).toBeEnabled();
  await add.click();
  const form = (await PDFDocument.load(fs.readFileSync(await download(page, "Download fillable PDF")))).getForm();
  expect(form.getFields().map((f) => f.getName()).sort()).toEqual(["email", "phone"]);
});

test("make fillable: resize with the keyboard, undo and redo, and a turned page is refused in words", async ({ page }) => {
  await page.goto("/make-pdf-fillable");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await page.getByRole("button", { name: "Text field", exact: true }).click();
  const mark = page.getByRole("group", { name: /Text field: Text 1/ });
  await expect(mark).toHaveAttribute("style", /width: 34%/);
  await mark.focus();
  await page.keyboard.press("+");
  await expect(mark).toHaveAttribute("style", /width: 36%/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(mark).toHaveAttribute("style", /width: 34%/);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(mark).toHaveAttribute("style", /width: 36%/);

  // A page turned with Rotate PDF.
  await page.goto("/rotate-pdf");
  await page.setInputFiles('input[type="file"]', fixture("text-2p.pdf"));
  await expect(page.getByRole("checkbox", { name: "Page 1" })).toBeVisible();
  await page.getByRole("button", { name: "Turn right" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const turned = `test-results/turned-fillable-${test.info().project.name}.pdf`;
  fs.mkdirSync("test-results", { recursive: true });
  fs.copyFileSync(await download(page, "Download rotated PDF"), turned);
  await page.goto("/make-pdf-fillable");
  await page.setInputFiles('input[type="file"]', turned);
  await page.getByRole("button", { name: "Text field", exact: true }).click();
  await page.getByRole("button", { name: "Add fields" }).click();
  await expect(page.getByText("Page 1 is turned sideways. Fields cannot be added to a turned page yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download fillable PDF" })).toHaveCount(0);
});
