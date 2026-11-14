import { CarryLink } from "./CarryLink";
import { presetPages } from "@/lib/tools";

/**
 * Internal links to the compress-size pages, shown under the compress tools. `current` is skipped. They sit right under
 * the tool and read like one of its options, so a file already chosen there goes along (`CarryLink`).
 */
export function SizeLinks({ current }: { current?: string }) {
  const pages = presetPages().filter((t) => t.slug !== current);
  return (
    <section aria-labelledby="sizes" className="mt-12">
      <h2 id="sizes" className="text-xl font-bold tracking-tight">Compress to a specific size</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {pages.map((t) => (
          <li key={t.slug}>
            <CarryLink href={`/${t.slug}`} className="pill-link">
              {t.name.replace("Compress PDF to ", "")}
            </CarryLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
