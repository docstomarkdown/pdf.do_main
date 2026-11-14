import fs from "node:fs";
import path from "node:path";
import { toString as hastToString } from "hast-util-to-string";
import type { Element, Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";
import { getTool } from "./tools";

/**
 * The blog's content system. Posts are Markdown files with a block of front matter, read and checked when the site is built;
 * nothing here reaches the browser. A post that breaks a rule fails the build with the whole list of problems, so a mistake
 * (a broken link, a picture with no alt text, a missing description) can never reach the live site.
 * The rules and how to write a post are in content/README.md.
 */

export type Heading = { id: string; text: string; depth: 2 | 3 };

export type Post = {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  updated?: string;
  tags: string[];
  /** The slug of the tool this post leads to, shown as a call to action at the end. */
  tool?: string;
  related: string[];
  /** The post's own picture for link previews, as a path under public/ ("/blog/name.png"). Without one, a picture is drawn from the title (app/og). */
  image?: string;
  /** What the picture shows, for people who cannot see it. Required with `image`. */
  imageAlt?: string;
  draft: boolean;
  html: string;
  headings: Heading[];
  words: number;
  minutes: number;
};

export type LoadOptions = {
  /** Where the Markdown files are. */
  dir?: string;
  /** Drafts are left out of the live site and shown while writing (`next dev`). */
  includeDrafts?: boolean;
  /** Today, as YYYY-MM-DD, for the rule that a post cannot be dated in the future. */
  today?: string;
  /** Where the site's pictures are: the folder a path like /blog/name.png is looked up in. */
  publicDir?: string;
};

export const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export class ContentError extends Error {
  constructor(public problems: string[]) {
    super(`The blog content has ${problems.length} ${problems.length === 1 ? "problem" : "problems"}:\n- ${problems.join("\n- ")}`);
    this.name = "ContentError";
  }
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGES = new Set(["/", "/blog", "/tools", "/how-it-works", "/licences"]);
// A post's file name is its address at the top of the site (/its-file-name), so it must not be one that a page, a folder
// of the site or a tool already has. Tools are looked up in the registry; these are the rest.
const TAKEN = new Set(["blog", "tools", "how-it-works", "licences", "gallery", "engines", "sitemap", "robots", "tags", "og", "home"]);

const validDate = (value: string) => DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

type Meta = Pick<Post, "title" | "description" | "date" | "updated" | "tags" | "tool" | "related" | "image" | "imageAlt" | "draft">;

function readMeta(file: string, raw: unknown, today: string, publicDir: string, problems: string[]): Meta | null {
  const bad = (message: string) => problems.push(`${file}: ${message}`);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) { bad("the front matter must be a list of fields between two lines of ---"); return null; }
  const data = raw as Record<string, unknown>;
  const known = new Set(["title", "description", "date", "updated", "tags", "tool", "related", "image", "imageAlt", "draft"]);
  for (const key of Object.keys(data)) if (!known.has(key)) bad(`unknown field "${key}" (allowed: ${[...known].join(", ")})`);

  const text = (key: string, min: number, max: number): string => {
    const value = data[key];
    if (typeof value !== "string" || value.trim() === "") { bad(`${key} is required`); return ""; }
    if (value.length < min || value.length > max) bad(`${key} is ${value.length} characters; it must be ${min} to ${max}`);
    return value.trim();
  };
  const day = (key: string, required: boolean): string => {
    const value = data[key] instanceof Date ? (data[key] as Date).toISOString().slice(0, 10) : data[key];
    if (value === undefined) { if (required) bad(`${key} is required (YYYY-MM-DD)`); return ""; }
    if (typeof value !== "string" || !validDate(value)) { bad(`${key} must be a real date written YYYY-MM-DD`); return ""; }
    return value;
  };

  const title = text("title", 10, 90);
  const description = text("description", 50, 200);
  const date = day("date", true);
  const updated = day("updated", false);
  if (date && date > today) bad(`date ${date} is in the future; mark the post draft: true until it is ready`);
  if (date && updated && updated < date) bad("updated is earlier than date");

  const tags = data.tags === undefined ? [] : data.tags;
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string" || !SLUG.test(t))) bad("tags must be a list of lowercase words joined by hyphens, such as [compress, file-size]");
  if (Array.isArray(tags) && tags.length > 5) bad("use at most five tags");
  const related = data.related === undefined ? [] : data.related;
  if (!Array.isArray(related) || related.some((r) => typeof r !== "string")) bad("related must be a list of post slugs");
  const tool = data.tool;
  if (tool !== undefined && (typeof tool !== "string" || !getTool(tool))) bad(`tool "${String(tool)}" is not a tool on this site (see lib/tools.ts)`);
  const draft = data.draft;
  if (draft !== undefined && typeof draft !== "boolean") bad("draft must be true or false");
  // A post's own picture for link previews. It is optional: without one, a picture is drawn from the title.
  const image = data.image;
  const imageAlt = data.imageAlt;
  if (image !== undefined) {
    if (typeof image !== "string" || !/^\/[\w./-]+\.(png|jpe?g|webp)$/.test(image) || image.includes("..")) bad('image must be a picture in the public folder, written like /blog/name.png (png, jpg or webp)');
    else if (!fs.existsSync(path.join(publicDir, image))) bad(`the picture ${image} is not in the public folder`);
    if (typeof imageAlt !== "string" || imageAlt.trim().length < 10 || imageAlt.length > 160) bad("imageAlt is required with image: say what the picture shows, in 10 to 160 characters");
  } else if (imageAlt !== undefined) bad("imageAlt is set but image is not");

  return {
    title, description, date, updated: updated || undefined,
    tags: Array.isArray(tags) ? (tags as string[]) : [],
    tool: typeof tool === "string" ? tool : undefined,
    related: Array.isArray(related) ? (related as string[]) : [],
    image: typeof image === "string" ? image : undefined,
    imageAlt: typeof imageAlt === "string" ? imageAlt.trim() : undefined,
    draft: draft === true,
  };
}

/** Markdown to HTML. Raw HTML is refused (not silently dropped), every heading gets an id and is a link to itself, and anything that can scroll can take focus. */
function renderMarkdown(source: string, file: string, problems: string[]) {
  const bad = (message: string) => problems.push(`${file}: ${message}`);
  const reader = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);
  const tree = reader.parse(source) as MdastRoot;

  let front: unknown = null;
  const links: { url: string; label: string }[] = [];
  let lastDepth = 1;
  visit(tree, (node) => {
    switch (node.type) {
      case "yaml":
        try { front = parseYaml(node.value); } catch (e) { bad(`the front matter is not valid YAML (${e instanceof Error ? e.message.split("\n")[0] : "error"})`); }
        break;
      case "html":
        bad(`raw HTML is not allowed (${node.value.slice(0, 40).replace(/\s+/g, " ")}…); write it in Markdown`);
        break;
      case "heading":
        if (node.depth === 1) bad("a post has no # heading in the body: its title is the heading. Start with ##");
        else if (node.depth > lastDepth + 1 && lastDepth >= 2) bad(`a ${"#".repeat(node.depth)} heading follows a ${"#".repeat(lastDepth)} heading; do not skip a level`);
        if (node.depth > 3) bad("headings go down to ### only");
        lastDepth = node.depth === 1 ? lastDepth : node.depth;
        break;
      case "image":
        if (!node.alt || node.alt.trim() === "") bad(`the picture ${node.url} has no alt text; describe it, or write what it shows in the sentence around it`);
        links.push({ url: node.url, label: "picture" });
        break;
      case "link":
      case "definition":
        links.push({ url: node.url, label: "link" });
        break;
    }
  });

  const writer = unified()
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(() => (hast: HastRoot) => {
      visit(hast, "element", (el: Element, index, parent) => {
        const link = (el.properties?.href ?? "") as string;
        if (el.tagName === "a" && /^https?:\/\//.test(link)) el.properties = { ...el.properties, rel: ["noopener", "noreferrer"] };
        if (el.tagName === "img") el.properties = { ...el.properties, loading: "lazy", decoding: "async" };
        if (el.tagName === "pre") el.properties = { ...el.properties, tabIndex: 0, role: "region", "aria-label": "Code" };
        if (el.tagName === "table" && parent && typeof index === "number") {
          // A wide table scrolls inside its own box instead of the page, and the box can be reached by keyboard.
          parent.children[index] = { type: "element", tagName: "div", properties: { className: ["table-scroll"], tabIndex: 0, role: "region", "aria-label": "Table" }, children: [el] };
          return "skip";
        }
      });
    })
    .use(rehypeStringify);
  const hast = writer.runSync(tree) as HastRoot;

  const headings: Heading[] = [];
  const ids = new Set<string>();
  visit(hast, "element", (el: Element) => {
    if (typeof el.properties?.id === "string") ids.add(el.properties.id);
    if ((el.tagName === "h2" || el.tagName === "h3") && typeof el.properties?.id === "string") {
      headings.push({ id: el.properties.id, text: hastToString(el), depth: el.tagName === "h2" ? 2 : 3 });
    }
  });
  const words = (hastToString(hast).match(/\S+/g) ?? []).length;

  return { front, links, ids, headings, words, html: writer.stringify(hast) as string };
}

/** Reads, checks and renders every post in a folder, newest first. Throws a `ContentError` listing every problem found. */
export async function loadPosts(options: LoadOptions = {}): Promise<Post[]> {
  const dir = options.dir ?? BLOG_DIR;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const publicDir = options.publicDir ?? path.join(process.cwd(), "public");
  const problems: string[] = [];
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_") && !f.startsWith(".")).sort() : [];

  type Parsed = { slug: string; meta: Meta; rendered: ReturnType<typeof renderMarkdown> };
  const parsed: Parsed[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    if (!SLUG.test(slug) || slug.length > 80) { problems.push(`${file}: the file name is the web address, so it must be lowercase words joined by hyphens (up to 80 characters)`); continue; }
    if (seen.has(slug)) problems.push(`${file}: duplicate address`);
    seen.add(slug);
    if (TAKEN.has(slug) || getTool(slug)) { problems.push(`${file}: the address /${slug} already belongs to a ${getTool(slug) ? "tool" : "page"} on this site; give the post another file name`); continue; }
    const rendered = renderMarkdown(fs.readFileSync(path.join(dir, file), "utf8"), file, problems);
    const meta = readMeta(file, rendered.front, today, publicDir, problems);
    if (meta) parsed.push({ slug, meta, rendered });
  }

  const live = parsed.filter((p) => options.includeDrafts || !p.meta.draft);
  const liveSlugs = new Set(live.map((p) => p.slug));
  const tags = new Set(live.flatMap((p) => p.meta.tags));
  for (const { slug, meta, rendered } of live) {
    const file = `${slug}.md`;
    if (!meta.draft && rendered.words < 150) problems.push(`${file}: only ${rendered.words} words; a published post needs at least 150 (or mark it draft: true)`);
    for (const r of meta.related) if (!liveSlugs.has(r) || r === slug) problems.push(`${file}: related post "${r}" is not another published post`);
    for (const { url, label } of rendered.links) {
      if (url.startsWith("#")) { if (!rendered.ids.has(url.slice(1))) problems.push(`${file}: the ${label} ${url} points at a heading that does not exist`); continue; }
      if (/^(https?:)?\/\//.test(url) || /^(mailto|tel):/.test(url)) { if (url.startsWith("//")) problems.push(`${file}: write the full address, starting https://, for ${url}`); continue; }
      if (!url.startsWith("/")) { problems.push(`${file}: the ${label} "${url}" must be a full https:// address or start with /`); continue; }
      const route = url.split(/[?#]/)[0].replace(/(.)\/$/, "$1");
      if (label === "picture") { if (!fs.existsSync(path.join(publicDir, route))) problems.push(`${file}: the picture ${url} is not in the public folder`); continue; }
      const post = route.startsWith("/blog/tags/") ? tags.has(route.slice(11)) : liveSlugs.has(route.slice(1)); // a post is at /its-file-name
      if (!PAGES.has(route) && !getTool(route.slice(1)) && !post) problems.push(`${file}: the link ${url} does not lead to a page on this site`);
    }
  }
  if (problems.length) throw new ContentError(problems);

  return live
    .map(({ slug, meta, rendered }): Post => ({
      slug, ...meta, html: rendered.html, headings: rendered.headings, words: rendered.words, minutes: Math.max(1, Math.round(rendered.words / 220)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

let cache: Promise<Post[]> | null = null;

/** The posts of the site, read once per build. Drafts show only while writing (`next dev`). */
export function getPosts(): Promise<Post[]> {
  return (cache ??= loadPosts({ includeDrafts: process.env.NODE_ENV !== "production" }));
}

export const allTags = (posts: Post[]): { tag: string; count: number }[] =>
  [...posts.reduce((m, p) => { p.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)); return m; }, new Map<string, number>())]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

// Day first ("6 November 2026"): the site is written in British English, and this was its one American date.
export const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** A tag as words: "file-size" is "file size". Tags are written as lowercase words joined by hyphens (content/README.md). */
export const tagName = (tag: string) => tag.replace(/-/g, " ");
/** The same with a capital, for a chip that stands alone: "File size". */
export const tagLabel = (tag: string) => tagName(tag).replace(/^./, (c) => c.toUpperCase());
