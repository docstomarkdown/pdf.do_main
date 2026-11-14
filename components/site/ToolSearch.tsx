"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { searchTools } from "@/lib/tools";

/**
 * The search over the tools: large on the home page, and `compact` at the top of the "All tools" menu, which puts it
 * on every page. `label` names the box (two can be on screen at once, so the menu's has its own), and `onNavigate`
 * runs when a result is opened (the menu closes itself with it).
 *
 * The results are real links in a list, so Tab, a click and "open in a new tab" work as for any link, and Enter in the
 * box opens the first. The arrow keys move through them as well: down from the box into the list, up from the first
 * result back to the box. Escape clears the search and returns to the box.
 *
 * That arrow-key movement is ours, and small. Looked at on 2026-11-11 and not used: a combobox from a library
 * (downshift 9, Headless UI 2, React Aria, cmdk: all permissively licensed and maintained) would replace these links
 * with listbox options opened by script, which rewrites code that is tested and works and gives up real links, for
 * this one behaviour; the browser's own datalist cannot show an icon or a description and does not open a tool.
 */
export function ToolSearch({ label = "Search tools", compact = false, onNavigate }: { label?: string; compact?: boolean; onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = searchTools(query).slice(0, 8);
  const searching = query.trim().length > 0;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const inBox = document.activeElement === input.current;
    if (e.key === "Enter" && inBox && results[0]) {
      onNavigate?.();
      router.push(`/${results[0].slug}`);
    } else if (e.key === "Escape" && query !== "") {
      // The first Escape belongs to the search: marked as dealt with, so the menu around it stays open (it listens on
      // the document and leaves a dealt-with Escape alone). The next one closes the menu.
      e.preventDefault();
      setQuery("");
      input.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const links = Array.from(box.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
      const at = links.indexOf(document.activeElement as HTMLAnchorElement); // -1 while the box itself has focus
      if (links.length === 0 || (at === -1 && e.key === "ArrowUp")) return; // nothing to move to; leave the caret alone
      e.preventDefault();
      const next = at + (e.key === "ArrowDown" ? 1 : -1);
      if (next < 0) input.current?.focus();
      else links[Math.min(next, links.length - 1)]?.focus();
    }
  }

  return (
    // The key handler is on the wrapper so it hears the box and the results alike.
    <div ref={box} role="search" aria-label={label} className="relative" onKeyDown={onKeyDown}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Icon name="search" className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3 ${compact ? "left-3.5" : "left-4"}`} />
      <input
        ref={input}
        id={id}
        type="search"
        value={query}
        autoComplete="off"
        placeholder="Search tools, e.g. compress"
        onChange={(e) => setQuery(e.target.value)}
        className={compact ? "ctl rounded-xl pl-11 pr-4" : "ctl rounded-2xl py-3.5 pl-12 pr-4 text-lg shadow-sm"}
      />
      {searching && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line-soft bg-raised shadow-lg">
          {/* One status line for both cases: read out when there are results, shown when there are none. */}
          <p role="status" className={results.length ? "sr-only" : "px-4 py-3 text-ink-2"}>
            {results.length
              ? `${results.length} ${results.length === 1 ? "tool matches" : "tools match"}. Use the arrow keys to move through them.`
              : <>No tool matches &ldquo;{query.trim()}&rdquo;. All the tools are listed below.</>}
          </p>
          {results.length > 0 && (
            <ul aria-label="Matching tools">
              {results.map((t) => (
                // cat-<group>: the icon and the hover tint take the tool's group colour, as in the menu.
                <li key={t.slug} className={`cat-${t.category}`}>
                  {/* The focus ring is drawn inside the row: the list's rounded box would clip one drawn outside. */}
                  <Link href={`/${t.slug}`} onClick={onNavigate} className="menu-link rounded-none px-4 py-3 outline-offset-[-3px]">
                    <Icon name={t.icon} className="cat-ink h-5 w-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block truncate text-sm text-ink-3">{t.short}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
