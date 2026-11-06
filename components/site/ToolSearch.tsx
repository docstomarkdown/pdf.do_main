"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { searchTools } from "@/lib/tools";

export function ToolSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const id = useId();
  const results = searchTools(query).slice(0, 8);
  const searching = query.trim().length > 0;

  return (
    <div role="search" className="relative">
      <label htmlFor={id} className="sr-only">Search tools</label>
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
      <input
        id={id}
        type="search"
        value={query}
        autoComplete="off"
        placeholder="Search tools, e.g. compress or merge"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) router.push(`/${results[0].slug}`);
          if (e.key === "Escape") setQuery("");
        }}
        className="ctl rounded-2xl py-3.5 pl-12 pr-4 text-lg shadow-sm"
      />
      {searching && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line-soft bg-raised shadow-lg">
          {results.length ? (
            <ul aria-label="Matching tools">
              {results.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}`} className="menu-link rounded-none px-4 py-3">
                    <Icon name={t.icon} className="h-5 w-5 shrink-0 text-action-ink" />
                    <span className="min-w-0">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block truncate text-sm text-ink-3">{t.short}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="px-4 py-3 text-ink-2">No tool matches &ldquo;{query.trim()}&rdquo; yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
