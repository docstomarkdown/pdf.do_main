import { expect, test } from "@playwright/test";
import { audit, watchErrors, watchOutbound } from "./helpers";

// The blog as a visitor meets it. These read whatever posts are in content/blog, so they keep working as posts come and go;
// the rules a post must pass are tested without a browser in content.spec.ts.

async function firstPostPath(page: import("@playwright/test").Page): Promise<string | null> {
  await page.goto("/blog");
  const link = page.getByTestId("post-card").first().getByRole("heading", { level: 2 }).getByRole("link");
  const href = (await link.count()) ? await link.getAttribute("href") : null;
  await page.waitForLoadState("networkidle"); // leave once the page has finished prefetching its links: WebKit reports one cut short as a page error
  return href;
}

test("the blog index lists the posts and the topics, and is accessible", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeVisible();
  const cards = page.getByTestId("post-card");
  test.skip((await cards.count()) === 0, "no posts yet");
  await expect(cards.first().getByRole("heading", { level: 2 })).toBeVisible();
  await expect(cards.first().locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  await expect(cards.first()).toContainText("min read");
  await expect(page.getByRole("navigation", { name: "Topics" }).getByRole("link").first()).toBeVisible();
  await audit(page, "blog index");
  await expect(page.getByRole("banner").getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("a post: heading, date, contents, structured data, tool card and links all work", async ({ page, context, baseURL }) => {
  const outside = watchOutbound(context, baseURL!);
  const errors = watchErrors(page);
  const href = await firstPostPath(page);
  test.skip(!href, "no posts yet");
  await page.goto(href!);
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!;
  expect(await page.title()).toBe(`${title} · pdf.do`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow"); // like the rest of the site, until go-live
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Blog" })).toBeVisible();
  await expect(page.locator("article time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);

  // Structured data parses and says what the page says.
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data["@type"]).toBe("Article");
  expect(data.headline).toBe(title);
  expect(data.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // Every heading in the text is a link to itself; the contents list jumps to them.
  const headings = page.locator(".blog-prose h2");
  expect(await headings.count()).toBeGreaterThan(0);
  const first = headings.first();
  const id = await first.getAttribute("id");
  await expect(first.getByRole("link")).toHaveAttribute("href", `#${id}`);
  const toc = page.getByTestId("toc");
  if (await toc.count()) {
    await toc.getByRole("link").last().click();
    await expect(page).toHaveURL(/#[a-z0-9-]+$/);
  }

  // Something that scrolls can be reached by keyboard.
  for (const region of await page.locator(".blog-prose [role='region']").all()) await expect(region).toHaveAttribute("tabindex", "0");
  await audit(page, "blog post, light");

  // The tool card leads to the tool.
  const card = page.getByRole("region", { name: "Try it in your browser" }).or(page.locator("section[aria-labelledby='try-it']"));
  if (await card.count()) {
    const link = card.getByRole("link").first();
    const target = await link.getAttribute("href");
    await page.waitForLoadState("networkidle"); // a page full of links prefetches them; WebKit reports one cut short by a navigation as a page error
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
  }
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("a post in dark mode: the text, links and code follow the theme and stay readable", async ({ page }) => {
  const href = await firstPostPath(page);
  test.skip(!href, "no posts yet");
  const colour = () => page.locator(".blog-prose p").first().evaluate((el) => getComputedStyle(el).color);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href!);
  const light = await colour();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(href!);
  const dark = await colour();
  expect(dark, "the text colour changes with the theme").not.toBe(light);
  await audit(page, "blog post, dark");
  await page.goto("/blog");
  await audit(page, "blog index, dark");
});

test("a topic page lists the posts with that tag", async ({ page }) => {
  await page.goto("/blog");
  const topic = page.getByRole("navigation", { name: "Topics" }).getByRole("link").first();
  test.skip((await topic.count()) === 0, "no topics yet");
  const name = (await topic.textContent())!.replace(/\s*\(\d+\)\s*$/, "").trim();
  await topic.click();
  await expect(page.getByRole("heading", { level: 1, name: `Posts about ${name}` })).toBeVisible();
  expect(await page.getByTestId("post-card").count()).toBeGreaterThan(0);
  await audit(page, "blog topic");
});
