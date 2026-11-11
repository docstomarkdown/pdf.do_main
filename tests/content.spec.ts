import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ContentError, loadPosts, type LoadOptions } from "../lib/content";

// The blog's content system, tested without a browser: Markdown in, checked HTML and data out, and every mistake an author can
// make refused with a message that says what and where. A mistake must stop the build, never reach the live site.

const TODAY = "2026-11-06";
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i % 40}`).join(" ");
const post = (front: Record<string, unknown>, body: string) => {
  const lines = Object.entries(front).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
};
const good = { title: "A title that is long enough", description: "A description that is long enough to be useful, at least fifty characters.", date: "2026-10-01" };
const BODY = `Opening paragraph. ${words(170)}\n\n## First part\n\nText.\n\n## Second part\n\nMore.`;

function load(files: Record<string, string>, options: LoadOptions = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-"));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  return loadPosts({ dir, today: TODAY, ...options }).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}
const problemsOf = async (files: Record<string, string>, options?: LoadOptions) => {
  try { await load(files, options); } catch (e) { if (e instanceof ContentError) return e.problems; throw e; }
  return [];
};

test("a good post: front matter, headings with ids and links, GFM, safe external links, reading time", async () => {
  const body = `${BODY}\n\n### A detail\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n~~old~~ and a [site](https://example.org) and a [tool](/compress-pdf) and [the start](#first-part).\n\n\`\`\`\nconst x = 1;\n\`\`\`\n\n- [x] done\n- [ ] not yet\n`;
  const [p] = await load({ "my-post.md": post({ ...good, tags: ["compress", "file-size"], tool: "compress-pdf" }, body) });
  expect(p).toMatchObject({ slug: "my-post", title: good.title, date: "2026-10-01", tags: ["compress", "file-size"], tool: "compress-pdf", draft: false });
  expect(p.headings).toEqual([
    { id: "first-part", text: "First part", depth: 2 },
    { id: "second-part", text: "Second part", depth: 2 },
    { id: "a-detail", text: "A detail", depth: 3 },
  ]);
  expect(p.html).toContain('<h2 id="first-part"><a href="#first-part">First part</a></h2>');
  expect(p.html).toContain('<a href="https://example.org" rel="noopener noreferrer">site</a>'); // an outside link cannot see where it came from
  expect(p.html).toContain('<div class="table-scroll"'); // a wide table scrolls in its own box
  expect(p.html).toContain('aria-label="Table"');
  expect(p.html).toContain("<del>old</del>");
  expect(p.html).toMatch(/<pre[^>]*tabindex="0"/); // a scrolling code block can take focus
  expect(p.html).toContain('type="checkbox"');
  expect(p.words).toBeGreaterThan(170);
  expect(p.minutes).toBe(1);
});

test("posts come newest first, drafts are left out of the live build and shown while writing", async () => {
  const files = {
    "older.md": post({ ...good, title: "An older post, long enough", date: "2026-01-05" }, BODY),
    "newer.md": post({ ...good, title: "A newer post, long enough", date: "2026-09-30" }, BODY),
    "wip.md": post({ ...good, title: "A draft, long enough", draft: true }, "Short."),
  };
  expect((await load(files)).map((p) => p.slug)).toEqual(["newer", "older"]);
  const withDrafts = await load(files, { includeDrafts: true });
  expect(withDrafts.map((p) => p.slug)).toEqual(["wip", "newer", "older"]);
  expect(withDrafts[0].draft).toBe(true);
});

test("files that are not posts are ignored: a leading underscore, another extension", async () => {
  expect(await load({ "_notes.md": "anything", "image.png": "x", "real.md": post(good, BODY) })).toHaveLength(1);
});

test("front matter mistakes are refused, in words", async () => {
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ["no description", { title: good.title, date: good.date }, /description is required/],
    ["a short description", { ...good, description: "Too short." }, /description is 10 characters; it must be 50 to 200/],
    ["a short title", { ...good, title: "Short" }, /title is 5 characters; it must be 10 to 90/],
    ["no date", { title: good.title, description: good.description }, /date is required/],
    ["not a real date", { ...good, date: "2026-02-31" }, /date must be a real date written YYYY-MM-DD/],
    ["a future date", { ...good, date: "2027-01-01" }, /date 2027-01-01 is in the future; mark the post draft: true/],
    ["updated before date", { ...good, updated: "2026-09-01" }, /updated is earlier than date/],
    ["an unknown field", { ...good, author: "me" }, /unknown field "author"/],
    ["a bad tag", { ...good, tags: ["Not Kebab"] }, /tags must be a list of lowercase words/],
    ["six tags", { ...good, tags: ["a", "b", "c", "d", "e", "f"] }, /at most five tags/],
    ["an unknown tool", { ...good, tool: "no-such-tool" }, /tool "no-such-tool" is not a tool on this site/],
    ["a related post that is not there", { ...good, related: ["ghost"] }, /related post "ghost" is not another published post/],
    ["draft not a boolean", { ...good, draft: "yes" }, /draft must be true or false/],
  ];
  for (const [name, front, expected] of cases) {
    const problems = await problemsOf({ "p.md": post(front, BODY) });
    expect(problems.join("\n"), name).toMatch(expected);
    expect(problems.every((x) => x.startsWith("p.md: ")), `${name}: each problem names the file`).toBe(true);
  }
  expect(await problemsOf({ "p.md": `${BODY}` })).toEqual([expect.stringContaining("front matter must be a list of fields")]);
  expect((await problemsOf({ "p.md": "---\ntitle: [unclosed\n---\nbody" })).join()).toMatch(/not valid YAML/);
});

test("the body is checked: headings, raw HTML, pictures, links, length", async () => {
  const bad = async (body: string) => (await problemsOf({ "p.md": post(good, `${words(170)}\n\n${body}`) })).join("\n");
  expect(await bad("# A body heading")).toMatch(/no # heading in the body/);
  expect(await bad("## One\n\n#### Skipped")).toMatch(/a #### heading follows a ## heading; do not skip a level/);
  expect(await bad("## One\n\n### Two\n\n#### Four")).toMatch(/headings go down to ### only/);
  expect(await bad("<div>raw</div>")).toMatch(/raw HTML is not allowed/);
  expect(await bad("![](/engines/merge.worker.js)")).toMatch(/has no alt text/);
  expect(await bad("![Shows it](/no/such/picture.png)")).toMatch(/is not in the public folder/);
  expect(await bad("[x](/no-such-page)")).toMatch(/the link \/no-such-page does not lead to a page on this site/);
  expect(await bad("[x](/ghost)")).toMatch(/does not lead to a page on this site/);
  expect(await bad("[x](/blog/ghost)")).toMatch(/does not lead to a page on this site/); // a post is at /its-file-name, not under /blog/
  expect(await bad("[x](/blog/tags/ghost)")).toMatch(/does not lead to a page on this site/);
  expect(await bad("[x](#nowhere)")).toMatch(/points at a heading that does not exist/);
  expect(await bad("[x](javascript:alert(1))")).toMatch(/must be a full https:\/\/ address or start with \//);
  expect(await bad("[x](page.html)")).toMatch(/must be a full https:\/\/ address or start with \//);
  expect(await bad("[x](//example.org)")).toMatch(/write the full address, starting https:\/\//);
  expect(await bad("[ok](/compress-pdf) [ok](/blog) [ok](/how-it-works) [ok](https://example.org) [ok](mailto:a@b.co)")).toBe("");
  expect((await problemsOf({ "p.md": post(good, "Far too short to publish.") })).join()).toMatch(/only 5 words; a published post needs at least 150/);
});

test("links between posts and tags are accepted when the target exists, drafts do not count as targets", async () => {
  const files = {
    "a.md": post({ ...good, tags: ["compress"], related: ["b"] }, `${BODY}\n\nSee [the other](/b) and [the topic](/blog/tags/compress).`),
    "b.md": post({ ...good, title: "The other post, long enough" }, BODY),
  };
  expect(await load(files)).toHaveLength(2);
  const withDraftTarget = { ...files, "b.md": post({ ...good, title: "The other post, long enough", draft: true }, BODY) };
  const problems = (await problemsOf(withDraftTarget)).join("\n");
  expect(problems).toMatch(/related post "b" is not another published post/);
  expect(problems).toMatch(/the link \/b does not lead to a page on this site/);
});

test("file names are the web address, so they must be tidy", async () => {
  expect((await problemsOf({ "Bad Name.md": post(good, BODY) })).join()).toMatch(/the file name is the web address/);
  expect((await problemsOf({ "under_score.md": post(good, BODY) })).join()).toMatch(/the file name is the web address/);
});

test("every problem in every post is reported together, not one at a time", async () => {
  let error: ContentError | undefined;
  try {
    await load({
      "one.md": post({ title: good.title, date: "2027-05-05" }, "# Heading\n\n![](/x.png)"),
      "two.md": post({ ...good, tool: "ghost" }, `${words(160)}\n\n[broken](/nowhere)`),
    });
  } catch (e) { error = e as ContentError; }
  expect(error).toBeInstanceOf(ContentError);
  expect(error!.problems.length).toBeGreaterThanOrEqual(6);
  expect(error!.message).toMatch(/^The blog content has \d+ problems:\n- /);
  expect(error!.problems.some((p) => p.startsWith("one.md")) && error!.problems.some((p) => p.startsWith("two.md"))).toBe(true);
});

test("a folder with no posts is fine", async () => {
  expect(await load({})).toEqual([]);
  expect(await loadPosts({ dir: path.join(os.tmpdir(), "no-such-blog-folder") })).toEqual([]);
});

test("the real posts in content/blog pass every check", async () => {
  const posts = await loadPosts({ includeDrafts: true });
  expect(posts.every((p) => p.slug && p.title && p.description)).toBe(true);
});

test("a post's address is the top of the site, so a file named like a tool or a page is refused", async () => {
  // The post would be published at /merge-pdf, which is the Merge PDF tool.
  expect((await problemsOf({ "merge-pdf.md": post(good, BODY) })).join()).toMatch(/merge-pdf\.md: the address \/merge-pdf already belongs to a tool on this site/);
  expect((await problemsOf({ "compress-pdf-to-1mb.md": post(good, BODY) })).join()).toMatch(/already belongs to a tool/);
  expect((await problemsOf({ "how-it-works.md": post(good, BODY) })).join()).toMatch(/how-it-works\.md: the address \/how-it-works already belongs to a page on this site/);
  expect((await problemsOf({ "blog.md": post(good, BODY) })).join()).toMatch(/already belongs to a page/);
  expect(await problemsOf({ "how-to-merge-pdfs.md": post(good, BODY) })).toEqual([]);
});

