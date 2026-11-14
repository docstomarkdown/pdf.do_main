import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { Icon } from "@/components/ui/Icon";
import { ABOUT_PAGES, PLATFORM_PREVIEW, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { getTool, presetPages, toolsByCategory, type CategoryId } from "@/lib/tools";

// A list's title in the footer: sentence case in the text colour, like every other heading on the site. Small
// capitals were dropped on 2026-11-11: with eight lists they read as fine print, and were the only capitals on the site.
const heading = "text-sm font-semibold text-ink";

type FootList = { label: string; links: { href: string; text: string }[]; twoUp?: boolean; openOnPhone?: boolean };

/** The footer's eight lists: one for each group of tools, the compress sizes, and the pages about the site. */
// The footer has its own order for the groups, and it is about fit, not importance (that order is CATEGORIES, which the
// home page and the menu follow). Four lists make a row, and a row is as tall as its longest list: with the two longest
// (Edit, and Merge, split and organise) in the same row the footer is 993 px tall at 1024 px wide; in the home page's
// order they fall in different rows and it grows to 1,121 px. A group missing from this list is added at the end.
const FOOT_ORDER: CategoryId[] = ["organise", "to-pdf", "from-pdf", "edit", "security", "compress"];

function footLists(): FootList[] {
  const sizes: FootList = { label: "Compress to a size", twoUp: true, links: presetPages().map((t) => ({ href: `/${t.slug}`, text: t.name.replace("Compress PDF to ", "") })) };
  const groups = toolsByCategory();
  const inOrder = [...FOOT_ORDER.flatMap((id) => groups.filter((g) => g.id === id)), ...groups.filter((g) => !FOOT_ORDER.includes(g.id))];
  return [
    // The sizes follow the Compress list, wherever the order puts it.
    ...inOrder.flatMap((c): FootList[] => {
      const list = { label: c.name, links: c.tools.map((t) => ({ href: `/${t.slug}`, text: t.name })) };
      return c.id === "compress" ? [list, sizes] : [list];
    }),
    {
      label: "About",
      // Three links, and on a phone the header shows none of them: this list starts open there.
      openOnPhone: true,
      links: ABOUT_PAGES.map((p) => ({ href: p.href, text: p.name })),
    },
  ];
}

// The platform preview's footer is short: the product, the few tools that matter and a link to all of them (/tools), and
// the pages about the site. The live footer lists every tool, for a site that is the tools.
const PREVIEW_TOOLS = ["merge-pdf", "sign-pdf", "fill-pdf-form", "compress-pdf"];
function previewLists(): FootList[] {
  return [
    { label: "Product", links: [{ href: "/#layer", text: "How the layer works" }, { href: "/#ai-chats", text: "Saving your chats" }] },
    { label: "Tools", links: [...PREVIEW_TOOLS.map(getTool).flatMap((t) => (t ? [{ href: `/${t.slug}`, text: t.name }] : [])), { href: "/tools", text: "All PDF tools" }] },
    { label: "About", openOnPhone: true, links: ABOUT_PAGES.map((p) => ({ href: p.href, text: p.name })) },
  ];
}

export function Footer() {
  const lists = PLATFORM_PREVIEW ? previewLists() : footLists();
  return (
    <footer className="mt-16 border-t border-line-soft bg-surface">
      <div className={`mx-auto max-w-5xl px-4 pt-12 sm:pb-10 ${PLATFORM_PREVIEW ? "lg:grid lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-start lg:gap-16" : ""}`.trim()}>
        <div className="max-w-md">
          <Link href="/" className="tap inline-flex items-center gap-2 rounded-lg text-xl font-bold tracking-tight">
            <Logo className="h-7 w-7 shrink-0 text-logo" />
            <span>
              pdf<span className="text-logo">.do</span>
            </span>
          </Link>
          <p className="mt-3 font-semibold">{SITE_TAGLINE}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            {PLATFORM_PREVIEW ? "Your chats, documents and decisions in one layer that any AI can draw on." : "Merge, split, convert, edit and protect PDFs without uploading them. No account, no watermark."}
          </p>
        </div>

        {/* The lists are written twice and only one is ever shown. On a phone the eight lists, all open, were 2,200 px:
            half of a tool page. There each list folds under its title (a native details element, closed until asked
            for). From 640 px they stand open in columns, as before. One set of markup cannot do both: a closed details
            cannot be shown open by CSS in every browser, and opening it by script would leave the footer wrong
            wherever the script has not run. Every link stays in the page either way. */}
        <div className="mt-8 divide-y divide-line-soft border-t border-line-soft sm:hidden">
          {lists.map((l) => (
            <nav key={l.label} aria-label={l.label}>
              <details className="group" open={l.openOnPhone}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg outline-offset-[-3px] [&::-webkit-details-marker]:hidden">
                  <h2 className={heading}>{l.label}</h2>
                  <Icon name="chevron-down" className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                </summary>
                <ul className={`pb-3 ${l.twoUp ? "grid grid-cols-2 gap-x-4" : ""}`.trim()}>
                  {l.links.map((a) => (<li key={a.href}><Link href={a.href} className="foot-link flex min-h-11 items-center">{a.text}</Link></li>))}
                </ul>
              </details>
            </nav>
          ))}
        </div>

        <div className={`hidden gap-8 sm:grid sm:grid-cols-2 ${PLATFORM_PREVIEW ? "mt-10 border-t border-line-soft pt-10 lg:mt-0 lg:grid-cols-3 lg:border-t-0 lg:pt-0" : "mt-10 border-t border-line-soft pt-10 lg:grid-cols-4"}`}>
          {lists.map((l) => (
            <nav key={l.label} aria-label={l.label}>
              <h2 className={`mb-3 ${heading}`}>{l.label}</h2>
              <ul className={l.twoUp ? "grid grid-cols-2 gap-x-4 gap-y-2" : "space-y-2"}>
                {l.links.map((a) => (<li key={a.href}><Link href={a.href} className="foot-link">{a.text}</Link></li>))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-sm text-ink-3">
          {/* The year is the year the site was last built: a static site has no clock of its own. */}
          <p>© {new Date().getFullYear()} {SITE_NAME}</p>
          <p>Your files are processed in your browser and are not uploaded.</p>
        </div>
      </div>
    </footer>
  );
}
