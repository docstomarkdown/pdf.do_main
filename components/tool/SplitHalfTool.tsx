"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { MultiResult, type OutputFile } from "./MultiResult";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { OptionCards } from "@/components/ui/OptionCards";
import { Segmented } from "@/components/ui/Segmented";
import { halvePages, splitPdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Way = "pages" | "document";
type Direction = "vertical" | "horizontal";

/** Cut every page in two (a scanned spread becomes two pages), or cut the document into a first and a second half. */
export function SplitHalfTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [way, setWay] = useState<Way>("pages");
  const [direction, setDirection] = useState<Direction>("vertical");
  const [previewPage, setPreviewPage] = useState(1);
  const pagesJob = useToolJob<{ file: File; pages: number; total: number }>();
  const partsJob = useToolJob<{ outputs: OutputFile[]; total: number }>();
  const busy = pagesJob.busy || partsJob.busy;
  useLeaveGuard(busy);
  const reset = () => { pagesJob.reset(); partsJob.reset(); };

  const first = Math.ceil(pageCount / 2);

  function runPages() {
    void pagesJob.run(async ({ signal }) => {
      const r = await halvePages(await file.arrayBuffer(), direction, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-halves.pdf`, { type: "application/pdf" }), pages: r.pages, total: r.total };
    }, "Something went wrong.");
  }

  function runDocument() {
    void partsJob.run(async ({ signal, setProgress }) => {
      const groups = [Array.from({ length: first }, (_, i) => i + 1), Array.from({ length: pageCount - first }, (_, i) => first + i + 1)];
      const r = await splitPdf(await file.arrayBuffer(), groups, setProgress, signal);
      const names = ["first-half", "second-half"];
      const outputs: OutputFile[] = r.files.map((f, i) => ({
        id: i + 1,
        file: new File([f.bytes], `${stem(file.name)}-${names[i]}.pdf`, { type: "application/pdf" }),
        detail: `${f.pages} ${f.pages === 1 ? "page" : "pages"}, pages ${f.first} to ${f.last}`,
      }));
      return { outputs, total: r.total };
    }, "Something went wrong.");
  }

  const noun = (n: number) => (n === 1 ? "page" : "pages");
  const done = pagesJob.result ?? partsJob.result;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !doc && <p role="status" className="text-ink-2">Reading pages…</p>}

      {doc && !done && (
        <>
          <OptionCards<Way>
            legend="What to cut in half"
            name="half-way"
            value={way}
            onChange={(w) => { reset(); setWay(w); }}
            disabled={busy}
            options={[
              { value: "pages", label: "Each page", description: "Cut every page down the middle, such as a scanned two-page spread. One PDF with twice the pages." },
              { value: "document", label: "The document", description: "The first half of the pages in one file and the rest in another." },
            ]}
          />

          {way === "pages" && (
            <>
              <Segmented<Direction> legend="Cut" name="half-direction" value={direction} onChange={(d) => { reset(); setDirection(d); }} disabled={busy}
                options={[{ value: "vertical", label: "Left and right" }, { value: "horizontal", label: "Top and bottom" }]} />
              <PagePreview doc={doc} page={previewPage} onPage={setPreviewPage}>
                <span className={`cutline ${direction === "vertical" ? "cutline-v" : "cutline-h"}`} data-testid="cut-line" />
              </PagePreview>
            </>
          )}
          {way === "document" && (
            <p className="text-ink-2" data-testid="half-plan">
              {pageCount < 2 ? "This PDF has one page, so there is nothing to cut in two." : `${pageCount} pages become a file of ${first} ${noun(first)} and a file of ${pageCount - first} ${noun(pageCount - first)}.`}
            </p>
          )}

          <ActionBar>
            {busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Cutting…" value={partsJob.progress} sublabel="Your file stays on this device." onCancel={() => { pagesJob.cancel(); partsJob.cancel(); }} /></div>
            ) : way === "pages" ? (
              <Button size="lg" onClick={runPages}>Cut each page in two</Button>
            ) : (
              <Button size="lg" disabled={pageCount < 2} onClick={runDocument}>Split into two files</Button>
            )}
          </ActionBar>
        </>
      )}

      {pagesJob.error && <Alert tone="error">{pagesJob.error}</Alert>}
      {partsJob.error && <Alert tone="error">{partsJob.error}</Alert>}

      {pagesJob.result && (
        <ResultPanel
          testId="half-result"
          url={pagesJob.result.url}
          file={pagesJob.result.file}
          fromTool="Split PDF in half"
          nextSlugs={["rotate-pdf", "organize-pages", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download PDF with each page cut in two"
          onReset={reset}
          summary={<p className="text-lg"><strong data-testid="half-pages">{pagesJob.result.pages} pages</strong> · from {pagesJob.result.total} · {formatBytes(pagesJob.result.file.size)}</p>}
        >
          <p className="hint" style={{ marginTop: 0 }}>The cut hides the other half of each page; it does not delete it from the file.</p>
        </ResultPanel>
      )}
      {partsJob.result && (
        <ResultPanel testId="half-parts-result" fromTool="Split PDF in half" nextSlugs={[]} onReset={reset}
          summary={<p className="text-lg"><strong>2 files</strong> from {partsJob.result.total} {noun(partsJob.result.total)}</p>}>
          <MultiResult outputs={partsJob.result.outputs} zipName={`${stem(file.name)}-halves`} />
        </ResultPanel>
      )}
    </div>
  );
}
