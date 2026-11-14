import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { LOGO } from "../lib/logo";

// The logo is one drawing: lib/logo.ts draws it on the pages and in the link previews, and app/icon.svg is the same drawing
// for the browser tab (a heavier line, so it holds at 16 px). Tested without a browser; a change to one that is not made to
// the other stops here. The logo never sits in a tile.

const icon = fs.readFileSync(path.join(__dirname, "..", "app", "icon.svg"), "utf8");
const all = (text: string, name: string) => [...text.matchAll(new RegExp(`\\s${name}="([^"]+)"`, "g"))].map((m) => m[1]);

test("the browser-tab icon is the logo's drawing", () => {
  expect(all(icon, "d")).toEqual([LOGO.outline, LOGO.fold]);
  expect(all(icon, "cx")).toEqual(LOGO.dots.map(([cx]) => String(cx)));
  expect(all(icon, "cy")).toEqual(LOGO.dots.map(([, cy]) => String(cy)));
});

test("the browser-tab icon is square, named, and not a tile", () => {
  const [, , width, height] = all(icon, "viewBox")[0].split(" ").map(Number);
  expect(width).toBe(height);
  expect(icon).toContain("<title>pdf.do</title>");
  expect(icon).not.toContain("<rect");
  // Its line is heavier than the logo's, for 16 px.
  expect(Number(all(icon, "stroke-width")[0])).toBeGreaterThan(LOGO.strokeWidth);
});

test("the logo's viewBox is square", () => {
  const [, , width, height] = LOGO.viewBox.split(" ").map(Number);
  expect(width).toBe(height);
});
