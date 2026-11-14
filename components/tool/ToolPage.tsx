import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Icon } from "@/components/ui/Icon";
import { TextLink } from "@/components/ui/TextLink";
import { ToolCard } from "@/components/site/ToolCard";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/site/Callout";
import { PLATFORM_PREVIEW, SITE_NAME, SITE_URL } from "@/lib/site";
import { getTool, type Tool } from "@/lib/tools";

/** The template every tool page uses: breadcrumb, heading, the tool, how-to steps, FAQ and related tools. */
export function ToolPage({ tool, children, extra }: { tool: Tool; children: ReactNode; extra?: ReactNode }) {
  const related = tool.related.map(getTool).filter((t): t is Tool => Boolean(t));
  const parent = tool.parent ? getTool(tool.parent) : undefined;

  const crumbs = [{ name: "Home", href: "/" }, ...(parent ? [{ name: parent.name, href: `/${parent.slug}` }] : []), { name: tool.name, href: `/${tool.slug}` }];
  // What the page tells search engines about itself, in their own vocabulary: where it sits in the site, that it is a
  // free tool that runs in a browser, and the questions it answers. Each says only what the page shows, and addresses
  // are written whole because a crawler reads this block without the page around it.
  const at = (href: string) => `${SITE_URL}${href === "/" ? "" : href}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: at(c.href) })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name,
      description: tool.intro,
      url: at(`/${tool.slug}`),
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any modern browser",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    ...(tool.faq.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: tool.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }]
      : []),
  ];

  return (
    // cat-<group>: the tool's group lends its tint and ink to the icon tile, the drop zone's icon and the step numbers.
    <div className={`cat-${tool.category}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <Breadcrumb className="mb-4" trail={crumbs.slice(0, -1)} current={tool.name} />

      {/* The minimal look (2026-11-13): the name large and centred, one line on what it does, three quiet facts. */}
      <div className="text-center">
        <h1 className="title">{tool.name}</h1>
        <p className="lead mx-auto mt-4 max-w-2xl">{tool.intro}</p>
        <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-ink-3">
          <li className="flex items-center gap-1.5">
            <Icon name="shield" className="ok-ink h-4 w-4 shrink-0" />
            <span>Processed in your browser. Nothing is uploaded. <TextLink href="/how-it-works" className="tap">How it works</TextLink></span>
          </li>
          <li className="flex items-center gap-1.5"><Icon name="check" className="ok-ink h-4 w-4 shrink-0" />Free, no sign-up</li>
          <li className="flex items-center gap-1.5"><Icon name="check" className="ok-ink h-4 w-4 shrink-0" />No watermark</li>
        </ul>
      </div>

      {/* The tool itself. It can take focus (not by Tab): the result panel hands focus here when its "Back to options" (or "Start over") removes it. */}
      <section aria-label={tool.name} tabIndex={-1} data-tool-region className="tool-region mt-8"><ErrorBoundary>{children}</ErrorBoundary></section>
      {extra}

      <section aria-labelledby="how-to" className="mt-24">
        <h2 id="how-to" className="section-title">How to use {tool.name}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tool.steps.map((s, i) => (
            <li key={s}>
              <span aria-hidden="true" className="step-num">{i + 1}</span>
              <p className="mt-3 text-ink-2">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq" className="mx-auto mt-20 max-w-3xl">
        <h2 id="faq" className="section-title">Questions</h2>
        <div className="mt-6 divide-y divide-line-soft border-y border-line-soft">
          {tool.faq.map((f) => (
            // The padding is on the summary, not the details: the whole row opens the answer, not just its line of text.
            // The focus ring is drawn inside the row so it stays within the card. An open row gives up a little of its
            // bottom padding instead of pulling the answer up over it, which would cover the row's lower edge.
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-1 py-4 font-semibold outline-offset-[-3px] group-open:pb-3 [&::-webkit-details-marker]:hidden">
                {f.q}
                <Icon name="chevron-down" className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-1 pb-4 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-20">
          <h2 id="related" className="section-title">More tools</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {related.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
          </ul>
        </section>
      )}

      {/* Preview only (lib/site.ts): the platform, once and quietly, under the tool. */}
      {PLATFORM_PREVIEW && (
        <Callout as="aside" className="mt-20" title="Make your files part of your AI's context"
          text="pdf.do keeps your documents with the ChatGPT, Claude and Gemini chats they came from, so any AI you use can draw on them."
          action={<ButtonLink href="/#layer" variant="secondary">See how it works</ButtonLink>} />
      )}
    </div>
  );
}
