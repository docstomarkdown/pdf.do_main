import type { ReactNode } from "react";
import { SourceBadge, type Source } from "@/components/ui/SourceBadge";

/*
 * A kept document as a row (its source, its name, a line about it and, from a search, the words that matched), and the
 * look of the search box above such rows. Used in the pictures of the platform on the home page today; meant for the
 * platform's own lists later.
 */

/** The words a search matched, highlighted. */
export function Hit({ children }: { children: ReactNode }) {
  return <mark className="mark-hl">{children}</mark>;
}

export function DocRow({ source, name, meta, match, selected = false }: { source: Source; name: string; meta: string; match?: ReactNode; selected?: boolean }) {
  return (
    <div className={`grid grid-cols-[1.375rem_1fr] items-start gap-2.5 rounded-xl px-2 py-2 text-[0.84rem] ${selected ? "row-on" : ""}`.trim()}>
      <SourceBadge source={source} />
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="text-xs text-ink-3">{meta}</div>
        {match && <div className="mt-0.5 text-[0.78rem] text-ink-2">{match}</div>}
      </div>
    </div>
  );
}

/** The search box as it looks above a list of documents (a picture of one, not a working field). */
export function DocSearch({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-[0.84rem]">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
      {children}
    </div>
  );
}
