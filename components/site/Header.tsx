"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { toolsByCategory } from "@/lib/tools";

const QUICK = [
  { href: "/merge-pdf", label: "Merge" },
  { href: "/compress-pdf", label: "Compress" },
  { href: "/delete-pdf-pages", label: "Delete pages" },
  { href: "/blog", label: "Blog" },
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
    <header className="relative z-30 border-b border-line-soft bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg text-xl font-bold tracking-tight">
            pdf<span className="text-action">.do</span>
          </Link>
          <Badge tone="warn">Prototype</Badge>
        </div>
        <nav aria-label="Main" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link href={q.href} aria-current={pathname === q.href ? "page" : undefined} className="nav-link">
                  {q.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button
            ref={button}
            variant="secondary"
            size="sm"
            icon={open ? "close" : "menu"}
            aria-expanded={open}
            aria-controls="all-tools"
            onClick={() => setOpenAt(open ? null : pathname)}
          >
            All tools
          </Button>
        </nav>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 top-[var(--header-h,3.75rem)] -z-10 bg-scrim" onClick={() => setOpenAt(null)} aria-hidden="true" />
          <div id="all-tools" className="absolute inset-x-0 top-full border-b border-line-soft bg-surface shadow-lg">
            <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:grid-cols-2">
              {toolsByCategory().map((c) => (
                <section key={c.id} aria-labelledby={`menu-${c.id}`}>
                  <h2 id={`menu-${c.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{c.name}</h2>
                  <ul className="space-y-1">
                    {c.tools.map((t) => (
                      <li key={t.slug}>
                        <Link href={`/${t.slug}`} className="menu-link">
                          <Icon name={t.icon} className="h-5 w-5 text-action-ink" />
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
