import { expect, test } from "@playwright/test";
import { safeEntryName, uniqueEntryNames, zipFileName } from "../lib/zip-names";

// Pure functions, no browser needed: the names that go inside a ZIP must be safe to unpack and all different.

test("a name loses folder parts, control characters and what Windows refuses", () => {
  expect(safeEntryName("../../etc/passwd")).toBe("passwd");
  expect(safeEntryName("C:\\Users\\me\\scan.pdf")).toBe("scan.pdf");
  expect(safeEntryName("a\u0000b.pdf")).toBe("ab.pdf");
  expect(safeEntryName("what?.pdf")).toBe("what.pdf");
  expect(safeEntryName("..hidden.")).toBe("hidden");
  expect(safeEntryName("  spaced name.pdf  ")).toBe("spaced name.pdf");
});

test("a name is never empty", () => {
  for (const name of ["", "...", "/", "  ", "\\", "??"]) expect(safeEntryName(name), JSON.stringify(name)).toBe("file");
});

test("two files with the same name keep both, in order, whatever the case", () => {
  expect(uniqueEntryNames(["a.pdf", "a.pdf", "A.PDF", "b", "b"])).toEqual(["a.pdf", "a (2).pdf", "A (3).PDF", "b", "b (2)"]);
  expect(uniqueEntryNames(["a (2).pdf", "a.pdf", "a.pdf"])).toEqual(["a (2).pdf", "a.pdf", "a (3).pdf"]);
});

test("the ZIP's own name always ends in .zip", () => {
  expect(zipFileName("Invoice split")).toBe("Invoice split.zip");
  expect(zipFileName("pages.ZIP")).toBe("pages.zip");
  expect(zipFileName("")).toBe("files.zip");
  expect(zipFileName("../x")).toBe("x.zip");
});
