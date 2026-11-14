import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

// Written out as /sitemap.xml when the site is built: a static export has no server to answer for it.
// It lists every page a visitor can reach: the home page, every tool and compress-size page, the pages about the site,
// the blog and its posts. Topic pages are lists of the same posts, so they are left out. Drafts never appear, because
// a production build does not load them. While every page carries noindex this file changes nothing for search engines;
// it is here so that it is right on the day the site is opened to them.
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  const at = (path: string) => `${SITE_URL}${path}`;
  return [
    { url: at("/") },
    ...TOOLS.map((t) => ({ url: at(`/${t.slug}`) })),
    { url: at("/tools") },
    { url: at("/how-it-works") },
    { url: at("/blog") },
    ...posts.map((p) => ({ url: at(`/${p.slug}`), lastModified: p.updated ?? p.date })),
    { url: at("/licences") },
  ];
}
