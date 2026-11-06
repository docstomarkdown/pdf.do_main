"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { FileDrop } from "./FileDrop";
import { PagePicker } from "./PagePicker";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { SelectionToolbar } from "./SelectionToolbar";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { extractPages, removePages } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { formatRanges, parseRanges } from "@/lib/ranges";
import { useHandoff } from "@/lib/use-handoff";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useThumbs } from "@/lib/use-thumbs";
import { useToolJob } from "@/lib/use-tool-job";

type Mode = "delete" | "extract";

const COPY = {
  delete: { tone: "danger" as const, field: "Pages to delete", verb: "Delete", out: "pages-removed", from: "Delete PDF pages", download: "Download PDF without those pages", busy: "Removing pages…", next: ["extract-pdf-pages", "merge-pdf", "compress-pdf"] },
  extract: { tone: "primary" as const, field: "Pages to keep", verb: "Extract", out: "extracted", from: "Extract PDF pages", download: "Download extracted PDF", busy: "Extracting pages…", next: ["delete-pdf-pages", "merge-pdf", "compress-pdf"] },
};

let fileSerial = 0;

/** Choose a PDF, pick pages from thumbnails or a range, get a new PDF. One tool, two modes. */
export function PagesTool({ mode }: { mode: Mode }) {
  const { file: handed, from } = useHandoff();
  const [chosen, setChosen] = useState<{ file: File; id: number } | null>(() => (handed ? { file: handed, id: ++fileSerial } : null));

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
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const { urls, request } = useThumbs(doc);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState<string | undefined>();
  const job = useToolJob<{ file: File; pages: number; total: number }>();
  useLeaveGuard(job.busy);

  const all = () => Array.from({ length: pageCount }, (_, i) => i + 1);
  const apply = (next: Set<number>) => {
    job.reset();
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
    job.reset();
    setRangeText(text);
    const parsed = parseRanges(text, pageCount);
    if (parsed.error) { setRangeError(parsed.error); return; }
    setRangeError(undefined);
    setSelected(new Set(parsed.pages));
  };

  const count = selected.size;
  const deletesAll = mode === "delete" && pageCount > 0 && count >= pageCount;
  const noun = (n: number) => (n === 1 ? "page" : "pages");

  function run() {
    void job.run(async () => {
      const pages = [...selected].sort((a, b) => a - b);
      const buffer = await file.arrayBuffer();
      const r = mode === "delete" ? await removePages(buffer, pages) : await extractPages(buffer, pages);
      const out = new File([r.bytes], `${stem(file.name)}-${copy.out}.pdf`, { type: "application/pdf" });
      return { file: out, pages: r.pages, total: r.total };
    }, "Something went wrong.");
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && pageCount === 0 && <p role="status" className="text-ink-2">Reading pages…</p>}

      {pageCount > 0 && !result && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <RangeField label={copy.field} value={rangeText} onChange={onRange} error={rangeError} disabled={job.busy} className="sm:w-80" />
            <SelectionToolbar
              className="sm:pb-[1.9rem]"
              disabled={job.busy}
              onAll={() => apply(new Set(all()))}
              onClear={() => apply(new Set())}
              onInvert={() => apply(new Set(all().filter((n) => !selected.has(n))))}
            />
          </div>

          <PagePicker pageCount={pageCount} urls={urls} request={request} selected={selected} onToggle={toggle} tone={copy.tone} />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label={copy.busy} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" variant={mode === "delete" ? "danger" : "primary"} disabled={count === 0 || deletesAll} onClick={run}>
                  {count === 0 ? `${copy.verb} pages` : `${copy.verb} ${count} ${noun(count)}`}
                </Button>
                <p aria-live="polite" className="text-sm text-ink-2">
                  {deletesAll ? "That is every page. Keep at least one." : count === 0 ? "Select at least one page." : `${count} of ${pageCount} ${noun(pageCount)} selected`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId={`${mode}-result`}
          url={result.url}
          file={result.file}
          fromTool={copy.from}
          nextSlugs={copy.next}
          downloadLabel={copy.download}
          onReset={() => { job.reset(); setSelected(new Set()); setRangeText(""); }}
          summary={<p className="text-lg"><strong data-testid="pages-after">{result.pages} {noun(result.pages)}</strong> · was {result.total} · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
