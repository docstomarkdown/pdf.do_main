import { expect, type BrowserContext, type Page } from "@playwright/test";
import { PDFDocument } from "@cantoo/pdf-lib";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

export const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);
export const size = (name: string) => fs.statSync(fixture(name)).size;

/** Every request the browser (pages and workers) makes outside our own origin. */
export function watchOutbound(context: BrowserContext, origin: string): string[] {
  const outside: string[] = [];
  context.on("request", (r) => {
    const url = r.url();
    if (url.startsWith(origin) || url.startsWith("blob:") || url.startsWith("data:")) return;
    outside.push(url);
  });
  return outside;
}

type Traffic = { pending: Set<object>; last: number };
const traffic = new WeakMap<Page, Traffic>();

/**
 * Starts counting what a page has asked for and not yet received. Call it before the page's first load (a
 * `beforeEach`), so nothing is in flight unseen; `quiet` calls it too, for a page that was never watched.
 */
export function watchTraffic(page: Page): Traffic {
  const known = traffic.get(page);
  if (known) return known;
  const t: Traffic = { pending: new Set(), last: Date.now() };
  traffic.set(page, t);
  const touch = () => { t.last = Date.now(); };
  page.on("request", (r) => { t.pending.add(r); touch(); });
  page.on("requestfinished", (r) => { t.pending.delete(r); touch(); });
  page.on("requestfailed", (r) => { t.pending.delete(r); touch(); });
  // A new document owes nothing for the one before it: what that one still had in flight ended with it.
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) { t.pending.clear(); touch(); } });
  return t;
}

/**
 * Waits until the page has nothing in flight and has started nothing for a moment. `waitForLoadState("networkidle")`
 * is reached once for each page load and says nothing about what began later: a link that appears or scrolls into
 * view afterwards (a message with a link in it, the result panel, "More tools") is prefetched then, in two requests
 * one after the other, and a navigation that cuts one short is reported by WebKit as a page error. The wait gives up
 * after `limitMs` without failing: the test's own checks stay the judge of what happened.
 */
export async function quiet(page: Page, calmMs = 250, limitMs = 5000): Promise<void> {
  const t = watchTraffic(page);
  const deadline = Date.now() + limitMs;
  while (Date.now() < deadline) {
    if (t.pending.size === 0 && Date.now() - t.last >= calmMs) return;
    await page.waitForTimeout(25);
  }
}

/** Console errors and uncaught exceptions. These include Content-Security-Policy violations. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (/favicon/i.test(text)) return; // some browsers probe /favicon.ico regardless of the icon link
    errors.push(`console: ${text}`);
  });
  return errors;
}

export async function pageCount(file: string): Promise<number> {
  return (await PDFDocument.load(fs.readFileSync(file))).getPageCount();
}

/** Text of one page as pdf.js sees it; empty when the page is only pixels. */
export async function pageText(file: string, pageNumber: number): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 });
  try {
    const page = await (await task.promise).getPage(pageNumber);
    const content = await page.getTextContent();
    return content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
  } finally {
    await task.destroy();
  }
}

/** Fails with a readable list of accessibility problems (WCAG 2.0/2.1 A and AA). */
export async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const lines = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(lines, `accessibility violations on ${label}`).toEqual([]);
}

/** Clicks the download link and returns the saved file's path. */
export async function download(page: Page, linkName: string | RegExp): Promise<string> {
  const link = page.getByRole("link", { name: linkName });
  await expect(link).toBeVisible({ timeout: 120_000 });
  const [d] = await Promise.all([page.waitForEvent("download"), link.click()]);
  return (await d.path())!;
}

/** Picks a radio option the way a person does: by clicking its card (the radio itself is visually hidden). */
export async function chooseOption(page: Page, name: string | RegExp) {
  await page.locator("label").filter({ has: page.getByRole("radio", { name }) }).click();
  await expect(page.getByRole("radio", { name })).toBeChecked();
}
