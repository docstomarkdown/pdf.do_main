"use client";

import { diffLines } from "diff";
import { useEffect, useState } from "react";
import { FileDrop } from "./FileDrop";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatBytes } from "@/lib/format";
import { usePdfDocument, type PdfDoc } from "@/lib/use-pdf-document";

type Change = { value: string; added?: boolean; removed?: boolean };
type PageDiff = { page: number; changes: Change[]; added: number; removed: number };

async function pagesOf(doc: PdfDoc): Promise<string[]> {
  const out: string[] = [];
  for (let n = 1; n <= doc.pageCount; n++) out.push(await doc.text(n));
  return out;
}

/** Compare the text of two PDFs page by page: lines added, lines removed, and the pages that differ. Text only, not pictures or layout. */
export function CompareTool() {
  const [first, setFirst] = useState<File | null>(null);
  const [second, setSecond] = useState<File | null>(null);
  const a = usePdfDocument(first);
  const b = usePdfDocument(second);
  const [diff, setDiff] = useState<PageDiff[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!a.doc || !b.doc) return;
    let alive = true;
    void Promise.all([pagesOf(a.doc), pagesOf(b.doc)]).then(([x, y]) => {
      if (!alive) return;
      const rows: PageDiff[] = [];
      for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const changes = diffLines((x[i] ?? "") + "\n", (y[i] ?? "") + "\n") as Change[];
        const count = (key: "added" | "removed") => changes.filter((c) => c[key]).reduce((n, c) => n + c.value.split("\n").filter((l) => l !== "").length, 0);
        rows.push({ page: i + 1, changes, added: count("added"), removed: count("removed") });
      }
      setDiff(rows);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [a.doc, b.doc]);

  const differing = (diff ?? []).filter((p) => p.added + p.removed > 0);
  const added = differing.reduce((n, p) => n + p.added, 0);
  const removed = differing.reduce((n, p) => n + p.removed, 0);
  const reset = () => { setFirst(null); setSecond(null); setDiff(null); setFailed(false); };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {([["Original", first, setFirst, a], ["Revised", second, setSecond, b]] as const).map(([label, file, set, doc]) => (
          <Card key={label} className="grid gap-3 p-4">
            <h2 className="font-semibold">{label}</h2>
            {file ? <p className="truncate" data-testid={`compare-${label.toLowerCase()}`}>{file.name} <span className="text-ink-3">· {doc.pageCount || "…"} pages · {formatBytes(file.size)}</span></p> : <p className="text-ink-3">No file chosen.</p>}
            {doc.error && <Alert tone="error">{doc.error}</Alert>}
            <FileDrop compact label={file ? "Choose a different file" : `Choose the ${label.toLowerCase()} PDF`} onFiles={(f) => { setDiff(null); setFailed(false); set(f[0]); }} />
          </Card>
        ))}
      </div>

      {first && second && !diff && !failed && !a.error && !b.error && <p role="status" className="text-ink-2">Reading both files…</p>}
      {failed && <Alert tone="error">One of the files could not be read.</Alert>}

      {diff && (
        <>
          <p className="text-lg" data-testid="compare-summary">
            {differing.length === 0 ? <strong>The text is the same.</strong> : <><strong>{differing.length} {differing.length === 1 ? "page differs" : "pages differ"}</strong>: {added} {added === 1 ? "line" : "lines"} added, {removed} removed.</>}
          </p>
          {differing.length === 0 && <p className="text-ink-2">Only text is compared. Pictures, layout and fonts could still differ.</p>}
          {differing.map((p) => (
            <Card key={p.page} className="p-4" data-testid="compare-page">
              <h2 className="mb-2 font-semibold">Page {p.page}</h2>
              <div className="diff" role="group" aria-label={`Changes on page ${p.page}`}>
                {p.changes.flatMap((c, ci) => c.value.split("\n").filter((l, i, all) => l !== "" || i < all.length - 1).filter((l) => l !== "").map((line, li) => (
                  <p key={`${ci}-${li}`} className={c.added ? "diff-add" : c.removed ? "diff-del" : "diff-same"}>
                    <span aria-hidden="true" className="diff-mark">{c.added ? "+" : c.removed ? "−" : " "}</span>
                    <span className="sr-only">{c.added ? "Added: " : c.removed ? "Removed: " : "Unchanged: "}</span>
                    {line}
                  </p>
                )))}
              </div>
            </Card>
          ))}
          <Button variant="ghost" onClick={reset}>Compare other files</Button>
        </>
      )}
    </div>
  );
}
