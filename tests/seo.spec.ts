import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { TOOLS } from "../lib/tools";

// What every page tells search engines and link previews, read from the files the build made. A page that forgets its
// address, its description or its picture fails here, so a new tool or post cannot go out half-described.
// (Whether search engines may list the site at all is a separate switch: tests/noindex.spec.ts.)

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");
const SITE = "https://www.pdf.do";

function pages(dir = OUT): { address: string; html: string }[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return pages(full);
    if (!e.name.endsWith(".html")) return [];
    const address = `/${path.relative(OUT, full).replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "")}`.replace(/\/$/, "") || "/";
    return [{ address, html: fs.readFileSync(full, "utf8") }];
  });
}
// The not-found page has no address of its own, and the component gallery is not part of the live site.
const real = () => pages().filter((p) => !["/404", "/_not-found"].includes(p.address) && !p.address.startsWith("/gallery"));
const head = (html: string) => html.slice(0, html.indexOf("</head>"));
const all = (html: string, re: RegExp) => [...head(html).matchAll(re)].map((m) => m[1]);
const meta = (html: string, key: string) => all(html, new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`, "g"));
const structured = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat() as Record<string, unknown>[]);

/** A PNG's width and height, from its header. */
function pngSize(file: string) {
  const b = fs.readFileSync(file);
  expect(b.subarray(1, 4).toString("latin1"), `${file} is a PNG`).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

test("every page gives its one true address, a title, a description and what a link preview needs", () => {
  const found = real();
  expect(found.length).toBeGreaterThan(40);
  for (const { address, html } of found) {
    const whole = address === "/" ? SITE : `${SITE}${address}`;
    expect(all(html, /<link rel="canonical" href="([^"]*)"/g), `${address}: one canonical address, its own`).toEqual([whole]);
    expect(all(html, /<title>([^<]*)<\/title>/g).length, `${address}: one title`).toBe(1);
    expect(meta(html, "description")[0]?.length ?? 0, `${address}: a description`).toBeGreaterThan(20);
    expect(meta(html, "og:url"), address).toEqual([whole]);
    expect(meta(html, "og:site_name"), address).toEqual(["pdf.do"]);
    expect(meta(html, "og:title")[0]?.length ?? 0, `${address}: a preview title`).toBeGreaterThan(3);
    expect(meta(html, "og:title")[0], `${address}: the preview title leaves the site's name to og:site_name`).not.toMatch(/· pdf\.do$/);
    expect(meta(html, "og:description")[0], address).toBe(meta(html, "description")[0]);
    expect(meta(html, "twitter:card"), address).toEqual(["summary_large_image"]);
    expect(meta(html, "og:image").length, `${address}: one preview picture`).toBe(1);
    expect(meta(html, "twitter:image"), address).toEqual(meta(html, "og:image"));
    expect(meta(html, "og:image:alt")[0]?.length ?? 0, `${address}: the picture is described`).toBeGreaterThan(3);
  }
});

test("every preview picture is a real file on the site, and the drawn ones are 1200 by 630", () => {
  const drawn = new Set<string>();
  for (const { address, html } of real()) {
    const [picture] = meta(html, "og:image");
    expect(picture.startsWith(`${SITE}/`), `${address}: ${picture} is on the site's own name`).toBe(true);
    const file = path.join(OUT, picture.slice(SITE.length));
    expect(fs.existsSync(file), `${address}: ${picture} was built`).toBe(true);
    if (picture.startsWith(`${SITE}/og/`)) drawn.add(file);
  }
  for (const file of drawn) expect(pngSize(file), path.relative(OUT, file)).toEqual({ width: 1200, height: 630 });
  // One for the home page and one for every tool, at least: nothing is shared with a blank or a borrowed picture.
  for (const key of ["home", ...TOOLS.map((t) => t.slug)]) expect(drawn.has(path.join(OUT, "og", `${key}.png`)), `/og/${key}.png`).toBe(true);
  // Two different pages do not get the same drawing.
  expect(fs.readFileSync(path.join(OUT, "og", "merge-pdf.png")).equals(fs.readFileSync(path.join(OUT, "og", "compress-pdf.png")))).toBe(false);
});

test("the sitemap and the pages agree: each address in it is a page that calls that address its own", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/\/$/, ""));
  const canon = new Set(real().map((p) => all(p.html, /<link rel="canonical" href="([^"]*)"/g)[0]));
  for (const a of listed) expect(canon.has(a), `${a} is some page's canonical address`).toBe(true);
});

test("robots.txt lets crawlers in and names the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toMatch(/^User-Agent: \*$/im);
  expect(text).toMatch(/^Allow: \/$/m);
  expect(text).not.toMatch(/^Disallow: \/$/m); // a blocked page could not show its noindex tag
  expect(text).toMatch(new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, "m"));
});

test("a tool page describes itself: where it sits, that it is a free tool in a browser, and the questions it answers", () => {
  for (const tool of TOOLS) {
    const html = fs.readFileSync(path.join(OUT, `${tool.slug}.html`), "utf8");
    const data = structured(html);
    expect(data.map((d) => d["@type"]), tool.slug).toEqual(["BreadcrumbList", "WebApplication", ...(tool.faq.length ? ["FAQPage"] : [])]);
    const [crumbs, app, faq] = data as [{ itemListElement: { item: string; name: string }[] }, Record<string, unknown>, { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } | undefined];
    expect(crumbs.itemListElement[0].item, `${tool.slug}: addresses are written whole`).toBe(SITE);
    expect(crumbs.itemListElement.at(-1)).toMatchObject({ name: tool.name, item: `${SITE}/${tool.slug}` });
    expect(app).toMatchObject({ name: tool.name, url: `${SITE}/${tool.slug}`, isAccessibleForFree: true, offers: { price: "0" } });
    // The questions in the data are the questions on the page, word for word: nothing is claimed that a visitor cannot read.
    if (faq) {
      expect(faq.mainEntity.map((q) => q.name), tool.slug).toEqual(tool.faq.map((f) => f.q));
      for (const f of tool.faq) expect(html, `${tool.slug}: "${f.q}" is on the page`).toContain(f.q.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
    }
  }
});

test("the home page names the site, and a post is an article with its address and picture", async ({ page }) => {
  const home = structured(fs.readFileSync(path.join(OUT, "index.html"), "utf8"));
  expect(home).toEqual([expect.objectContaining({ "@type": "WebSite", name: "pdf.do", url: SITE })]);

  await page.goto("/blog");
  const first = page.getByTestId("post-card").first().getByRole("heading", { level: 2 }).getByRole("link");
  test.skip((await first.count()) === 0, "no posts yet");
  const href = (await first.getAttribute("href"))!;
  const html = fs.readFileSync(path.join(OUT, `${href.slice(1)}.html`), "utf8");
  expect(meta(html, "og:type")).toEqual(["article"]);
  expect(meta(html, "article:published_time")[0]).toMatch(/^\d{4}-\d{2}-\d{2}/);
  const [article] = structured(html);
  expect(article).toMatchObject({ "@type": "Article", url: `${SITE}${href}`, mainEntityOfPage: `${SITE}${href}`, image: meta(html, "og:image")[0] });
});

test("every page points at the browser-tab icon and at the home-screen icon, a 180 pixel PNG", async ({ request }) => {
  expect(pngSize(path.join(OUT, "apple-touch-icon.png"))).toEqual({ width: 180, height: 180 });
  expect((await request.get("/apple-touch-icon.png")).headers()["content-type"]).toContain("image/png");
  expect((await request.get("/icon.svg")).headers()["content-type"]).toContain("image/svg+xml");
  for (const { address, html } of pages()) {
    expect(all(html, /<link rel="icon" href="([^"?]*)/g), `${address}: the tab icon`).toEqual(["/icon.svg"]);
    expect(all(html, /<link rel="apple-touch-icon" href="([^"?]*)/g), `${address}: the home-screen icon`).toEqual(["/apple-touch-icon.png"]);
  }
});
