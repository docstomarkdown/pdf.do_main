import type { Metadata } from "next";
import { SITE_NAME } from "./site";
import type { Tool } from "./tools";

/** The size every link-preview picture is drawn at: the shape Facebook, LinkedIn, X, Slack and WhatsApp all crop to. */
export const SHARE_SIZE = { width: 1200, height: 630 };

/**
 * The picture a link preview shows for a page. A page that has its own picture (a post's `image`) uses it; every other
 * page gets one drawn from its title when the site is built (app/og), so no page is ever shared without a picture.
 */
export const sharePicture = (path: string, own?: string) => own ?? `/og/${path === "/" ? "home" : path.slice(1)}.png`;

type PageMeta = {
  /** The page's address on this site, such as "/merge-pdf". */
  path: string;
  /** The page's own title, without the site's name: the layout adds that to the browser tab, and previews carry it separately. */
  title: string;
  description: string;
  /** The page's own picture, if it has one (a path under public/). Leave out to have one drawn. */
  image?: string;
  imageAlt?: string;
  /** Posts are articles; everything else is a page of the site. */
  article?: { published: string; modified?: string; tags: string[] };
  /** The home page's tab title is written whole, not through the layout's "… · pdf.do" pattern. */
  wholeTitle?: string;
};

/**
 * Everything a page tells search engines and link previews, in one place: its title and description, its one true
 * address (canonical), and the Open Graph and X card that a pasted link is drawn from. Every page calls this, so a new
 * page cannot forget one of them. Addresses are written as paths; the layout's `metadataBase` makes them whole.
 */
export function pageMeta({ path, title, description, image, imageAlt, article, wholeTitle }: PageMeta): Metadata {
  const picture = { url: sharePicture(path, image), alt: imageAlt ?? title, ...(image ? {} : SHARE_SIZE) };
  return {
    title: wholeTitle ? { absolute: wholeTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_GB",
      images: [picture],
      ...(article
        ? { type: "article" as const, publishedTime: article.published, modifiedTime: article.modified ?? article.published, tags: article.tags }
        : { type: "website" as const }),
    },
    twitter: { card: "summary_large_image", title, description, images: [picture] },
  };
}

/** A tool page's metadata, from the registry. */
export const toolMeta = (tool: Tool): Metadata => pageMeta({ path: `/${tool.slug}`, title: tool.name, description: tool.intro });
