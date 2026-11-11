import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Icon } from "@/components/ui/Icon";
import { TextLink } from "@/components/ui/TextLink";
import { ToolCard } from "@/components/site/ToolCard";
import { getTool, type Tool } from "@/lib/tools";

/** The template every tool page uses: breadcrumb, heading, the tool, how-to steps, FAQ and related tools. */
export function ToolPage({ tool, children, extra }: { tool: Tool; children: ReactNode; extra?: ReactNode }) {
  const related = tool.related.map(getTool).filter((t): t is Tool => Boolean(t));
  const parent = tool.parent ? getTool(tool.parent) : undefined;

  const crumbs = [{ name: "Home", href: "/" }, ...(parent ? [{ name: parent.name, href: `/${parent.slug}` }] : []), { name: tool.name, href: `/${tool.slug}` }];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.href })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name,
      description: tool.intro,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any modern browser",
    },
  ];

  return (
    // cat-<group>: the tool's group lends its tint and ink to the icon tile, the drop zone's icon and the step numbers.
    <div className={`cat-${tool.category}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="font-medium text-ink">{c.name}</span>
              ) : (
                <Link href={c.href} className="rounded text-action-ink hover:underline">{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <span aria-hidden="true" className="tool-card-icon tool-card-icon-lg mb-4"><Icon name={tool.icon} className="h-7 w-7" /></span>
      <h1 className="title">{tool.name}</h1>
      <p className="lead mt-3 max-w-2xl">{tool.intro}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-ink-2">
        <Icon name="shield" className="h-4 w-4 shrink-0 text-success" />
        <span>Processed in your browser. Nothing is uploaded. <TextLink href="/how-it-works">How it works</TextLink></span>
      </p>

      <section aria-label={tool.name} className="mt-8"><ErrorBoundary>{children}</ErrorBoundary></section>
      {extra}

      <section aria-labelledby="how-to" className="mt-16">
        <h2 id="how-to" className="section-title">How to use {tool.name}</h2>
        <ol className="mt-5 space-y-4">
          {tool.steps.map((s, i) => (
            <li key={s} className="flex gap-4">
              <span aria-hidden="true" className="step-num">{i + 1}</span>
              <p className="pt-1">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq" className="mt-14">
        <h2 id="faq" className="section-title">Questions</h2>
        <div className="lift-1 mt-5 divide-y divide-line-soft rounded-2xl border border-line-soft bg-surface">
          {tool.faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <Icon name="chevron-down" className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-14">
          <h2 id="related" className="section-title">More tools</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {related.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
          </ul>
        </section>
      )}
    </div>
  );
}
