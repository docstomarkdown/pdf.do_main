"use client";

import { useEffect, useRef, useState } from "react";
import { FileDrop } from "./FileDrop";
import { PagePicker } from "./PagePicker";
import { ResultPanel } from "./ResultPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { extractPages, removePages } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { clearHandoff, peekHandoff } from "@/lib/handoff";
import { formatRanges, parseRanges } from "@/lib/ranges";
import { usePdfThumbs } from "@/lib/use-pdf-thumbs";

type Mode = "delete" | "extract";
type Result = { url: string; file: File; pages: number; total: number };

const COPY = {
  delete: { tone: "danger" as const, field: "Pages to delete", verb: "Delete", out: "pages-removed", from: "Delete PDF pages", download: "Download PDF without those pages", busy: "Removing pages…", next: ["extract-pdf-pages", "merge-pdf", "compress-pdf"] },
  extract: { tone: "primary" as const, field: "Pages to keep", verb: "Extract", out: "extracted", from: "Extract PDF pages", download: "Download extracted PDF", busy: "Extracting pages…", next: ["delete-pdf-pages", "merge-pdf", "compress-pdf"] },
};

let fileSerial = 0;

/** Choose a PDF, pick pages from thumbnails or a range, get a new PDF. One tool, two modes. */
export function PagesTool({ mode }: { mode: Mode }) {
  const [chosen, setChosen] = useState<{ file: File; id: number } | null>(() => {
    const h = peekHandoff();
    return h ? { file: h.file, id: ++fileSerial } : null;
  });
  const [from] = useState(() => peekHandoff()?.from);
  useEffect(() => { clearHandoff(); }, []);

  if (!chosen) {
    return <FileDrop label="Choose a PDF" onFiles={(f) => setChosen({ file: f[0], id: ++fileSerial })} />;
  }
  return (
    <Workspace
      key={chosen.id}
      file={chosen.file}
      mode={mode}
      from={from}
      onChoose={(f) => setChosen({ file: f, id: ++fileSerial })}
    />
  );
}

function Workspace({ file, mode, from, onChoose }: { file: File; mode: Mode; from?: string; onChoose: (file: File) => void }) {
  const copy = COPY[mode];
  const { pageCount, urls, error: readError, request } = usePdfThumbs(file);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const clearResult = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setResult(null);
  };
  const apply = (next: Set<number>) => {
    clearResult();
    setError(null);
    setSelected(next);
    setRangeText(formatRanges(next));
    setRangeError(undefined);
  };
  const toggle = (n: number) => {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n); else next.add(n);
    apply(next);
  };
  const onRange = (text: string) => {
    clearResult();
    setRangeText(text);
    const parsed = parseRanges(text, pageCount);
    if (parsed.error) { setRangeError(parsed.error); return; }
    setRangeError(undefined);
    setSelected(new Set(parsed.pages));
  };

  const count = selected.size;
  const deletesAll = mode === "delete" && pageCount > 0 && count >= pageCount;
  const noun = (n: number) => (n === 1 ? "page" : "pages");

  async function run() {
    setBusy(true);
    setError(null);
    clearResult();
    try {
      const pages = [...selected].sort((a, b) => a - b);
      const buffer = await file.arrayBuffer();
      const r = mode === "delete" ? await removePages(buffer, pages) : await extractPages(buffer, pages);
      const out = new File([r.bytes], `${stem(file.name)}-${copy.out}.pdf`, { type: "application/pdf" });
      const url = URL.createObjectURL(out);
      urlRef.current = url;
      setResult({ url, file: out, pages: r.pages, total: r.total });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Icon name="file" className="h-6 w-6 shrink-0 text-slate-500" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{file.name}</p>
            <p className="text-sm text-slate-600">{pageCount ? `${pageCount} ${noun(pageCount)} · ` : ""}{formatBytes(file.size)}</p>
          </div>
        </div>
        <FileDrop compact label="Choose a different file" onFiles={(f) => onChoose(f[0])} />
      </div>

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && pageCount === 0 && <p role="status" className="text-slate-700">Reading pages…</p>}

      {pageCount > 0 && !result && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              label={copy.field}
              placeholder="e.g. 2, 5-7"
              value={rangeText}
              onChange={(e) => onRange(e.target.value)}
              error={rangeError}
              hint="Click pages below, or type page numbers and ranges."
              disabled={busy}
              className="sm:w-80"
              inputMode="numeric"
            />
            <div className="flex flex-wrap gap-2 sm:pb-[1.9rem]">
              <Button variant="secondary" disabled={busy} onClick={() => apply(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}>Select all</Button>
              <Button variant="secondary" disabled={busy} onClick={() => apply(new Set())}>Clear</Button>
              <Button variant="secondary" disabled={busy} onClick={() => apply(new Set(Array.from({ length: pageCount }, (_, i) => i + 1).filter((n) => !selected.has(n))))}>Invert</Button>
            </div>
          </div>

          <PagePicker pageCount={pageCount} urls={urls} request={request} selected={selected} onToggle={toggle} tone={copy.tone} />

          <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.18)] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" variant={mode === "delete" ? "danger" : "primary"} disabled={busy || count === 0 || deletesAll} onClick={run} className="w-full sm:w-auto">
                {count === 0 ? `${copy.verb} pages` : `${copy.verb} ${count} ${noun(count)}`}
              </Button>
              <p aria-live="polite" className="text-sm text-slate-700">
                {deletesAll ? "That is every page. Keep at least one." : count === 0 ? "Select at least one page." : `${count} of ${pageCount} ${noun(pageCount)} selected`}
              </p>
            </div>
          </div>
        </>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      {busy && <Progress label={copy.busy} />}

      {result && (
        <ResultPanel
          testId={`${mode}-result`}
          url={result.url}
          file={result.file}
          fromTool={copy.from}
          nextSlugs={copy.next}
          downloadLabel={copy.download}
          onReset={() => { clearResult(); setSelected(new Set()); setRangeText(""); }}
          summary={<p className="text-lg"><strong data-testid="pages-after">{result.pages} {noun(result.pages)}</strong> · was {result.total} · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
