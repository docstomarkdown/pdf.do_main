"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/site/Logo";
import { ToolSearch } from "@/components/site/ToolSearch";
import { ABOUT_PAGES, PLATFORM_PREVIEW } from "@/lib/site";
import { toolsByCategory } from "@/lib/tools";

// A list's title in the menu: sentence case in the text colour, the same as in the footer.
const heading = "mb-1 text-sm font-semibold text-ink";

// The header says where each link goes, and little else (the minimal look of 2026-11-13). The two tools people come
// for most stay first; "All tools" opens the full list. In the platform preview the AI-chats part of the home page is a
// link of its own.
const QUICK = [
  ...(PLATFORM_PREVIEW ? [{ href: "/#layer", label: "How the layer works" }] : [{ href: "/merge-pdf", label: "Merge" }, { href: "/compress-pdf", label: "Compress" }]),
  { href: "/how-it-works", label: PLATFORM_PREVIEW ? "Privacy" : "How it works" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  const pathname = usePathname();
  // The menu is "open at" the page it was opened on, so navigating closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const button = useRef<HTMLButtonElement>(null);
  // A link to the page you are already on changes no address, so the menu is closed by the click itself.
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Not an Escape the search inside the menu has already used to clear itself.
      if (e.key === "Escape" && !e.defaultPrevented) {
        setOpenAt(null);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      {/* On a phone the menu button is 44 px tall, not 40 (see "Tap targets" in globals.css): a little less padding
          keeps the header the height it was. */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:py-3.5">
        <Link href="/" className="tap inline-flex items-center gap-2 rounded-lg text-xl font-bold tracking-tight">
          <Logo className="h-7 w-7 shrink-0 text-logo" />
          <span>
            pdf<span className="text-logo">.do</span>
          </span>
        </Link>
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
            {PLATFORM_PREVIEW ? "PDF tools" : "All tools"}
          </Button>
          {/* Preview only: there are no accounts yet, so the live site has no sign-up button. */}
          {PLATFORM_PREVIEW && <ButtonLink href="/#tools" size="sm" className="ml-1 hidden sm:inline-flex">Start free</ButtonLink>}
        </nav>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 top-[var(--header-h,3.75rem)] -z-10 bg-scrim" onClick={() => setOpenAt(null)} aria-hidden="true" />
          <div id="all-tools" className="site-menu absolute inset-x-0 top-full border-b border-line-soft bg-surface">
            <div className="mx-auto max-w-5xl px-4 py-5">
              {/* On a phone this menu is all the navigation there is, so it carries the search and the pages about the
                  site as well as the tools. */}
              <div className="max-w-md"><ToolSearch compact label="Search all tools" onNavigate={close} /></div>
              {/* Columns the lists flow down, not a grid of rows: a row is as tall as its longest list, and Edit is
                  three times the length of the shortest. Four columns on a computer bring the menu to about one
                  screen; a list is never split between two columns. */}
              <div className="mt-5 gap-x-5 sm:columns-2 md:columns-3 lg:columns-4">
                {toolsByCategory().map((c) => (
                  <section key={c.id} aria-labelledby={`menu-${c.id}`} className={`cat-${c.id} mb-5 break-inside-avoid`}>
                    <h2 id={`menu-${c.id}`} className={heading}>{c.name}</h2>
                    <ul>
                      {c.tools.map((t) => (
                        <li key={t.slug}>
                          <Link href={`/${t.slug}`} className="menu-link" onClick={close}>
                            <Icon name={t.icon} className="cat-ink h-5 w-5 shrink-0" />
                            <span className="font-medium">{t.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                <section aria-labelledby="menu-about" className="mb-5 break-inside-avoid">
                  <h2 id="menu-about" className={heading}>About</h2>
                  <ul>
                    {ABOUT_PAGES.map((p) => (
                      <li key={p.href}>
                        <Link href={p.href} className="menu-link" onClick={close}>
                          <Icon name={p.icon} className="h-5 w-5 shrink-0 text-ink-3" />
                          <span className="font-medium">{p.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
