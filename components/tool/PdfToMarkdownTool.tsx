"use client";

import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { TextOutput } from "./TextOutput";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { stem } from "@/lib/format";
import { toMarkdown, type TextLine } from "@/lib/markdown";
import { formatRanges } from "@/lib/ranges";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

/** Turn the text of a PDF into Markdown, guessing headings, lists and paragraphs from sizes and spacing. */
export function PdfToMarkdownTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const job = useToolJob<{ markdown: string; pages: number; empty: number[] }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);
  const count = pick.selected.size;

  function run() {
    void job.run(async ({ signal, setProgress, setStatus }) => {
      if (!doc) throw new Error("This file could not be read as a PDF.");
      const pages = [...pick.selected].sort((a, b) => a - b);
      const collected: TextLine[][] = [];
      const empty: number[] = [];
      for (const [i, n] of pages.entries()) {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        setStatus(`Reading page ${n} (${i + 1} of ${pages.length})…`);
        const lines = await doc.lines(n);
        if (lines.length === 0) empty.push(n);
        collected.push(lines);
        setProgress((i + 1) / pages.length);
      }
      return { markdown: toMarkdown(collected), pages: pages.length, empty };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "page" : "pages");

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />
      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !doc && <p role="status" className="text-ink-2">Reading pages…</p>}

      {doc && !result && (
        <>
          <RangeField label="Pages to convert" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy} className="sm:w-80"
            placeholder="All pages" hint="Leave empty for every page, or type page numbers and ranges." />
          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label={job.status || "Working…"} value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={count === 0 || !!pick.rangeError} onClick={run}>Convert to Markdown</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{count === 0 ? "No pages are chosen." : `${count} of ${pageCount} ${noun(pageCount)}`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel testId="markdown-result" fromTool="PDF to Markdown" nextSlugs={[]} onReset={() => job.reset()}
          summary={<p className="text-lg"><strong>{result.pages} {noun(result.pages)}</strong> converted</p>}>
          <div className="grid gap-4">
            <Alert tone="info">Headings, lists and paragraphs are guessed from text sizes and spacing, so check the result. Tables, columns, bold text and links are not recognised.</Alert>
            {result.empty.length > 0 && (
              <Alert tone="warn">{result.empty.length === 1 ? "Page" : "Pages"} {formatRanges(result.empty)} {result.empty.length === 1 ? "has" : "have"} no text and {result.empty.length === 1 ? "is" : "are"} left out: probably a scan. Reading text from pictures (OCR) is not built yet.</Alert>
            )}
            {result.markdown !== "" && <TextOutput text={result.markdown} label="Markdown" filename={`${stem(file.name)}.md`} />}
          </div>
        </ResultPanel>
      )}
    </div>
  );
}
