import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
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
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="font-medium text-slate-900">{c.name}</span>
              ) : (
                <Link href={c.href} className="rounded text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600">{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{tool.name}</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-700">{tool.intro}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <Icon name="shield" className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>Processed in your browser. Nothing is uploaded. <Link href="/how-it-works" className="font-semibold text-indigo-700 underline hover:text-indigo-900">How it works</Link></span>
      </p>

      <section aria-label={tool.name} className="mt-8">{children}</section>
      {extra}

      <section aria-labelledby="how-to" className="mt-16">
        <h2 id="how-to" className="text-2xl font-bold tracking-tight text-slate-900">How to use {tool.name}</h2>
        <ol className="mt-5 space-y-4">
          {tool.steps.map((s, i) => (
            <li key={s} className="flex gap-4">
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-800">{i + 1}</span>
              <p className="pt-1 text-slate-800">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq" className="mt-14">
        <h2 id="faq" className="text-2xl font-bold tracking-tight text-slate-900">Questions</h2>
        <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {tool.faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
                {f.q}
                <Icon name="chevron-down" className="h-5 w-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-slate-800">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-14">
          <h2 id="related" className="text-2xl font-bold tracking-tight text-slate-900">More tools</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {related.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
          </ul>
        </section>
      )}
    </div>
  );
}
