import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Written out as /robots.txt when the site is built. It lets every crawler read every page and tells it where the
// sitemap is. This is right even while the site is kept out of search results: that is done by the noindex tag and
// header on each page (app/layout.tsx), and a crawler has to be allowed to fetch a page to see them. Blocking pages
// here instead would hide the noindex and could leave bare addresses in the results.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
