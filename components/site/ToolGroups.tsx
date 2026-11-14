import Link from "next/link";
import { ToolCard } from "@/components/site/ToolCard";
import { getTool, presetPages, toolsByCategory, type Tool } from "@/lib/tools";

/** A few tools as small links (by slug, names from the registry): the most-used ones under a search, or any short list. */
export function ToolChips({ slugs, label }: { slugs: string[]; label: string }) {
  const tools = slugs.map(getTool).filter((t): t is Tool => Boolean(t));
  return (
    <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2" aria-label={label}>
      {tools.map((t) => (<li key={t.slug}><Link href={`/${t.slug}`} className="chip-link">{t.name}</Link></li>))}
    </ul>
  );
}

/** Every tool, by group, with the compress-to-a-size links under Compress. `level` is the groups' heading level. */
export function ToolGroups({ level = 2 }: { level?: 2 | 3 }) {
  const H = level === 3 ? "h3" : "h2";
  return (
    <div className="mt-14 space-y-12">
      {toolsByCategory().map((c) => (
        <section key={c.id} aria-labelledby={`cat-${c.id}`}>
          <div className="mb-4">
            <H id={`cat-${c.id}`} className="text-xl font-bold tracking-tight">{c.name}</H>
            <p className="text-ink-2">{c.blurb}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.tools.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
          </ul>
          {c.id === "compress" && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Or compress straight to a size</p>
              <ul className="flex flex-wrap gap-2">
                {presetPages().map((t) => (
                  <li key={t.slug}><Link href={`/${t.slug}`} className="pill-link">{t.name.replace("Compress PDF to ", "")}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
