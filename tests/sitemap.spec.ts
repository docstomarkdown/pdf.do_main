import { expect, test } from "@playwright/test";
import { TOOLS } from "../lib/tools";

// The sitemap is written when the site is built. These read the file the build made: it lists every page a visitor can
// reach, each address is written in full on the site's own name, each one opens, and a post sits at /its-file-name.

const SITE = "https://www.pdf.do";

test("sitemap.xml lists the home page, every tool, the pages about the site and every post, and each address opens", async ({ page, request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  const addresses = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(new Set(addresses).size, "no address twice").toBe(addresses.length);
  for (const a of addresses) expect(a.startsWith(`${SITE}/`), `${a} is on the site's own name`).toBe(true);
  const paths = addresses.map((a) => a.slice(SITE.length));

  for (const fixed of ["/", "/tools", "/how-it-works", "/blog", "/licences"]) expect(paths, fixed).toContain(fixed);
  for (const tool of TOOLS) expect(paths, tool.slug).toContain(`/${tool.slug}`);
  expect(paths.some((p) => p.startsWith("/gallery"))).toBe(false); // the component gallery is not part of the live site
  expect(paths.some((p) => p.startsWith("/blog/"))).toBe(false); // posts have direct addresses; topic pages are left out

  // Every post on the blog index is in the sitemap, at the address its card links to.
  await page.goto("/blog");
  const posts = await page.getByTestId("post-card").getByRole("heading", { level: 2 }).getByRole("link").evaluateAll((links) => links.map((l) => l.getAttribute("href")!));
  for (const p of posts) {
    expect(p, "a post's address has nothing in front of it").toMatch(/^\/[a-z0-9-]+$/);
    expect(paths).toContain(p);
  }
  expect(paths.length).toBe(5 + TOOLS.length + posts.length);

  // Nothing in the sitemap is a dead end.
  for (const p of paths) expect((await request.get(p)).status(), `${p} opens`).toBe(200);
});

test("a post no longer answers at its old address under /blog/", async ({ page, request }) => {
  await page.goto("/blog");
  const first = page.getByTestId("post-card").first().getByRole("heading", { level: 2 }).getByRole("link");
  test.skip((await first.count()) === 0, "no posts yet");
  const href = (await first.getAttribute("href"))!;
  expect((await request.get(href)).status()).toBe(200);
  expect((await request.get(`/blog${href}`)).status()).toBe(404);
});
