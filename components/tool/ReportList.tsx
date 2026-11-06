import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatBytes } from "@/lib/format";

export type Finding = {
  id: string | number;
  /** ok: nothing found. warn and bad: found something, mildly or seriously. info: a neutral note. */
  tone: "ok" | "warn" | "bad" | "info";
  /** The badge text. The word carries the meaning, so the colour never has to ("Found", "Clear"). */
  label: string;
  title: string;
  detail?: ReactNode;
};

/** What a scan found, one row per check: a badge with a word on it, what was checked, and what it means. */
export function ReportList({ findings, label }: { findings: Finding[]; label: string }) {
  return (
    <ul aria-label={label} className="report">
      {findings.map((f) => (
        <li key={f.id} className="find">
          <span className="find-badge"><Badge tone={f.tone}>{f.label}</Badge></span>
          <p>
            <b>{f.title}</b>
            {f.detail && <><br />{f.detail}</>}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Facts about a file as label and value pairs ("Pages", "48"). A real description list, so it reads as pairs. */
export function FactList({ facts, label }: { facts: { label: string; value: ReactNode }[]; label: string }) {
  return (
    <dl aria-label={label} className="facts">
      {facts.map((f) => (
        <div key={f.label} className="fact">
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * What a total is made of, as a bar and a list. The bar is only a picture: every part is also a line of text with its
 * size and share, so nothing depends on seeing colour. Up to five parts get their own colour; further parts repeat them.
 */
export function BreakdownBar({ parts, label }: { parts: { id: string | number; label: string; bytes: number }[]; label: string }) {
  const total = parts.reduce((n, p) => n + p.bytes, 0);
  return (
    <div className="grid gap-3">
      <div className="seg-bar" aria-hidden="true">
        {parts.filter((p) => p.bytes > 0).map((p) => (
          <i key={p.id} className={`seg-${(parts.indexOf(p) % 5) + 1}`} style={{ flexGrow: p.bytes }} />
        ))}
      </div>
      <ul aria-label={label} className="seg-legend">
        {parts.map((p, i) => (
          <li key={p.id}>
            <span aria-hidden="true" className={`seg-swatch seg-${(i % 5) + 1}`} />
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            <span className="text-ink-3">{formatBytes(p.bytes)} · {total ? Math.round((p.bytes / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
