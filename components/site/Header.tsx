"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { toolsByCategory } from "@/lib/tools";

const QUICK = [
  { href: "/merge-pdf", label: "Merge" },
  { href: "/compress-pdf", label: "Compress" },
  { href: "/delete-pdf-pages", label: "Delete pages" },
];

export function Header() {
  const pathname = usePathname();
  // The menu is "open at" the page it was opened on, so navigating closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenAt(null);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="relative z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg text-xl font-bold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            pdf<span className="text-indigo-600">.do</span>
          </Link>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Prototype</span>
        </div>
        <nav aria-label="Main" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link href={q.href} aria-current={pathname === q.href ? "page" : undefined} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 aria-[current=page]:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
                  {q.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls="all-tools"
            onClick={() => setOpenAt(open ? null : pathname)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Icon name={open ? "close" : "menu"} className="h-4 w-4" />
            All tools
          </button>
        </nav>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 top-[var(--header-h,3.75rem)] -z-10 bg-slate-900/20" onClick={() => setOpenAt(null)} aria-hidden="true" />
          <div id="all-tools" className="absolute inset-x-0 top-full border-b border-slate-200 bg-white shadow-lg">
            <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:grid-cols-2">
              {toolsByCategory().map((c) => (
                <section key={c.id} aria-labelledby={`menu-${c.id}`}>
                  <h2 id={`menu-${c.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{c.name}</h2>
                  <ul className="space-y-1">
                    {c.tools.map((t) => (
                      <li key={t.slug}>
                        <Link href={`/${t.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600">
                          <Icon name={t.icon} className="h-5 w-5 text-indigo-700" />
                          <span className="font-medium">{t.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
