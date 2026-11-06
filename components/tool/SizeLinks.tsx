import Link from "next/link";
import { presetPages } from "@/lib/tools";

/** Internal links to the compress-size pages, shown under the compress tools. `current` is skipped. */
export function SizeLinks({ current }: { current?: string }) {
  const pages = presetPages().filter((t) => t.slug !== current);
  return (
    <section aria-labelledby="sizes" className="mt-12">
      <h2 id="sizes" className="text-xl font-bold tracking-tight text-slate-900">Compress to a specific size</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {pages.map((t) => (
          <li key={t.slug}>
            <Link href={`/${t.slug}`} className="inline-block rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-800 hover:bg-indigo-100 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              {t.name.replace("Compress PDF to ", "")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
