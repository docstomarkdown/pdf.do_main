"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { PageGrid, type GridPage } from "./PageGrid";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { JobProgress } from "@/components/ui/JobProgress";
import { organizePdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useHistory } from "@/lib/use-history";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useThumbs } from "@/lib/use-thumbs";
import { useToolJob } from "@/lib/use-tool-job";

type Layout = { pages: GridPage[] };

/** Reorder, turn and delete pages on a grid of thumbnails, with undo and redo, then save the new PDF. */
export function OrganizeTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const { urls, request } = useThumbs(doc, 160);
  const job = useToolJob<{ file: File; pages: number; total: number }>();
  useLeaveGuard(job.busy);
  const [selected, setSelected] = useState<number | null>(null);

  // The history starts when the file's pages are known; until then it holds nothing.
  const history = useHistory<Layout>({ pages: [] });
  const [started, setStarted] = useState(0);
  if (pageCount > 0 && started !== pageCount) {
    setStarted(pageCount);
    history.reset({ pages: Array.from({ length: pageCount }, (_, i) => ({ id: i + 1, n: i + 1, rotate: 0 })) });
  }
  const pages = history.value.pages;
  const at = selected === null ? null : Math.min(selected, pages.length - 1);
  const unchanged = pages.length === pageCount && pages.every((p, i) => p.n === i + 1 && p.rotate === 0);

  const edit = (next: GridPage[]) => { job.reset(); history.set({ pages: next }); };

  function run() {
    void job.run(async ({ signal }) => {
      const r = await organizePdf(await file.arrayBuffer(), pages.map((p) => ({ n: p.n, turn: p.rotate })), signal);
      return { file: new File([r.bytes], `${stem(file.name)}-organised.pdf`, { type: "application/pdf" }), pages: r.pages, total: r.total };
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
          <div className="flex flex-wrap items-center gap-1">
            <IconButton icon="undo" label="Undo" disabled={!history.canUndo || job.busy} onClick={() => { job.reset(); history.undo(); }} />
            <IconButton icon="redo" label="Redo" disabled={!history.canRedo || job.busy} onClick={() => { job.reset(); history.redo(); }} />
            <Button variant="ghost" size="sm" disabled={unchanged || job.busy} onClick={() => { job.reset(); history.reset({ pages: Array.from({ length: pageCount }, (_, i) => ({ id: i + 1, n: i + 1, rotate: 0 })) }); setSelected(null); }}>
              Back to the original
            </Button>
          </div>

          <PageGrid
            pages={pages}
            selected={at}
            urls={urls}
            request={request}
            onSelect={setSelected}
            onMove={(i, d) => { const next = [...pages]; [next[i], next[i + d]] = [next[i + d], next[i]]; edit(next); setSelected(i + d); }}
            onRotate={(i) => edit(pages.map((p, j) => (j === i ? { ...p, rotate: (p.rotate + 90) % 360 } : p)))}
            onDelete={(i) => { edit(pages.filter((_, j) => j !== i)); setSelected(Math.min(i, pages.length - 2)); }}
          />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Saving the new order…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={unchanged} onClick={run}>Save new PDF</Button>
                <p aria-live="polite" className="text-sm text-ink-2" data-testid="organize-status">
                  {unchanged ? "Nothing has changed yet." : `${pages.length} of ${pageCount} ${noun(pageCount)} will be kept`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="organize-result"
          url={result.url}
          file={result.file}
          fromTool="Organise PDF pages"
          nextSlugs={["page-numbers", "merge-pdf", "compress-pdf", "split-pdf"]}
          downloadLabel="Download organised PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="organize-pages">{result.pages} {noun(result.pages)}</strong> · was {result.total} · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
