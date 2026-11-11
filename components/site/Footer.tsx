import Link from "next/link";
import { presetPages, toolsByCategory } from "@/lib/tools";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line-soft bg-surface-2">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {toolsByCategory().map((c) => (
          <nav key={c.id} aria-label={c.name}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-3">{c.name}</h2>
            <ul className="space-y-2">
              {c.tools.map((t) => (<li key={t.slug}><Link href={`/${t.slug}`} className="foot-link">{t.name}</Link></li>))}
            </ul>
          </nav>
        ))}
        <nav aria-label="Compress to a size">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-3">Compress to a size</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {presetPages().map((t) => (<li key={t.slug}><Link href={`/${t.slug}`} className="foot-link">{t.name.replace("Compress PDF to ", "")}</Link></li>))}
          </ul>
        </nav>
        <nav aria-label="About">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-3">About</h2>
          <ul className="space-y-2">
            <li><Link href="/how-it-works" className="foot-link">How it works and your privacy</Link></li>
            <li><Link href="/blog" className="foot-link">Blog</Link></li>
            <li><Link href="/licences" className="foot-link">Licences</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line-soft">
        <p className="mx-auto max-w-5xl px-4 py-4 text-sm text-ink-3">
          Your files are processed in your browser and are not uploaded.
        </p>
      </div>
    </footer>
  );
}
