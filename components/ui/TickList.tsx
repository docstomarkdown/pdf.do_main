/** A short list of what something does, each line behind a small tick. */
export function TickList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`grid gap-2.5 ${className}`.trim()}>
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-ink-2">
          <span className="tick-dot mt-0.5" aria-hidden="true">
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10.5l3 3 7-7" /></svg>
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
