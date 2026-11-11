import Link from "next/link";

export type Crumb = { name: string; href: string };

/**
 * Where a page sits in the site: the pages above it as links (`trail`, starting at Home), then the page itself as
 * plain text (`current`). One look for tools, posts and topics. Leave `current` out where the page's own title follows
 * at once and is long (a post): the trail alone says where you are.
 * The links carry `.tap`, so each takes a tap in a 44 px tall area though the words are small.
 */
export function Breadcrumb({ trail, current, className = "" }: { trail: Crumb[]; current?: string; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
        {trail.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link href={c.href} className="tap rounded text-action-ink hover:underline">{c.name}</Link>
          </li>
        ))}
        {current && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-medium text-ink">{current}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}
