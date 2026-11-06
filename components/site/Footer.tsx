import Link from "next/link";
import { presetPages, toolsByCategory } from "@/lib/tools";

const linkClass = "rounded text-sm text-slate-700 hover:text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {toolsByCategory().map((c) => (
          <nav key={c.id} aria-label={c.name}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{c.name}</h2>
            <ul className="space-y-2">
              {c.tools.map((t) => (<li key={t.slug}><Link href={`/${t.slug}`} className={linkClass}>{t.name}</Link></li>))}
            </ul>
          </nav>
        ))}
        <nav aria-label="Compress to a size">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Compress to a size</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {presetPages().map((t) => (<li key={t.slug}><Link href={`/${t.slug}`} className={linkClass}>{t.name.replace("Compress PDF to ", "")}</Link></li>))}
          </ul>
        </nav>
        <nav aria-label="About">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">About</h2>
          <ul className="space-y-2">
            <li><Link href="/how-it-works" className={linkClass}>How it works and your privacy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <p className="mx-auto max-w-5xl px-4 py-4 text-sm text-slate-600">
          pdf.do is a work in progress. Your files are processed in your browser and are not uploaded.
        </p>
      </div>
    </footer>
  );
}
