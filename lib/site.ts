/** The site's own address, for the places that must write it in full: the sitemap, robots.txt, canonical links and link previews. Pages link to each other by path. */
export const SITE_URL = "https://www.pdf.do";
export const SITE_NAME = "pdf.do";
export const SITE_TAGLINE = "PDF tools that run in your browser";
/** The pages about the site, for the footer and the "All tools" menu. The icon is a name from components/ui/Icon. */
export const ABOUT_PAGES = [
  { href: "/how-it-works", name: "How it works and your privacy", icon: "shield" },
  { href: "/blog", name: "Blog", icon: "text" },
  { href: "/licences", name: "Licences", icon: "info" },
] as const;
/** One or two sentences that say what the site is, for the footer and for places that describe the whole site. */
export const SITE_DESCRIPTION = "Merge, split, convert, edit and protect PDFs without uploading them. Processing happens in your browser.";
