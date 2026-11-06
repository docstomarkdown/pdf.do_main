"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { PagePicker } from "./PagePicker";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { SelectionToolbar } from "./SelectionToolbar";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { rotatePdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useThumbs } from "@/lib/use-thumbs";
import { useToolJob } from "@/lib/use-tool-job";

/** Turn pages a quarter or half turn. The thumbnails turn as you press, so you see what you will get before saving. */
export function RotateTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const { urls, request } = useThumbs(doc);
  const [turns, setTurns] = useState<Record<number, number>>({});
  const job = useToolJob<{ file: File; pages: number; turned: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, false, job.reset);

  const turned = Object.values(turns).filter((a) => a % 360 !== 0).length;
  const everyPage = pick.selected.size === 0;

  function turnBy(angle: number) {
    job.reset();
    const targets = everyPage ? Array.from({ length: pageCount }, (_, i) => i + 1) : [...pick.selected];
    setTurns((prev) => {
      const next = { ...prev };
      for (const n of targets) next[n] = (((next[n] ?? 0) + angle) % 360 + 360) % 360;
      return next;
    });
  }

  function run() {
    void job.run(async ({ signal }) => {
      const wanted = Object.fromEntries(Object.entries(turns).filter(([, a]) => a % 360 !== 0));
      const r = await rotatePdf(await file.arrayBuffer(), wanted, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-rotated.pdf`, { type: "application/pdf" }), pages: r.pages, turned: r.turned };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "page" : "pages");

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && pageCount === 0 && <p role="status" className="text-ink-2">Reading pages…</p>}

      {pageCount > 0 && !result && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <RangeField label="Pages to turn" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy} className="sm:w-80" />
            <SelectionToolbar className="sm:pb-[1.9rem]" disabled={job.busy} onAll={pick.selectAll} onClear={pick.clear} onInvert={pick.invert} />
          </div>

          <div>
            <div role="group" aria-label="Turn" className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" icon="rotate-left" disabled={job.busy} onClick={() => turnBy(-90)}>Turn left</Button>
              <Button variant="secondary" icon="rotate" disabled={job.busy} onClick={() => turnBy(90)}>Turn right</Button>
              <Button variant="secondary" disabled={job.busy} onClick={() => turnBy(180)}>Turn 180°</Button>
              <Button variant="ghost" disabled={job.busy || turned === 0} onClick={() => { job.reset(); setTurns({}); }}>Undo all turns</Button>
            </div>
            <p className="hint" aria-live="polite">
              {everyPage ? "No pages are selected, so a turn applies to every page." : `A turn applies to the ${pick.selected.size} selected ${noun(pick.selected.size)}.`}
            </p>
          </div>

          <PagePicker pageCount={pageCount} urls={urls} request={request} selected={pick.selected as Set<number>} onToggle={pick.toggle} tone="primary" rotations={turns} />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Turning pages…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={turned === 0} onClick={run}>Save rotated PDF</Button>
                <p aria-live="polite" className="text-sm text-ink-2">
                  {turned === 0 ? "Turn at least one page." : `${turned} of ${pageCount} ${noun(pageCount)} turned`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="rotate-result"
          url={result.url}
          file={result.file}
          fromTool="Rotate PDF"
          nextSlugs={["page-numbers", "extract-pdf-pages", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download rotated PDF"
          onReset={() => { job.reset(); setTurns({}); pick.clear(); }}
          summary={<p className="text-lg"><strong data-testid="turned-count">{result.turned} {noun(result.turned)} turned</strong> · {result.pages} {noun(result.pages)} · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
