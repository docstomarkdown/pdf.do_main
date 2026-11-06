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
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
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
        className="block w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-lg text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-indigo-600"
      />
      {searching && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          {results.length ? (
            <ul aria-label="Matching tools">
              {results.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-indigo-600">
                    <Icon name={t.icon} className="h-5 w-5 shrink-0 text-indigo-700" />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">{t.name}</span>
                      <span className="block truncate text-sm text-slate-600">{t.short}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="px-4 py-3 text-slate-700">No tool matches &ldquo;{query.trim()}&rdquo; yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
