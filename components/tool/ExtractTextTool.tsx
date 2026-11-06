"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { TextOutput } from "./TextOutput";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { JobProgress } from "@/components/ui/JobProgress";
import { formatRanges } from "@/lib/ranges";
import { stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

/** Read the text stored in a PDF. Scanned pages are pictures and have none: the result says which pages those are. */
export function ExtractTextTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [marks, setMarks] = useState(false);
  const job = useToolJob<{ text: string; words: number; pages: number; empty: number[] }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);
  const count = pick.selected.size;

  function run() {
    void job.run(async ({ signal, setProgress, setStatus }) => {
      if (!doc) throw new Error("This file could not be read as a PDF.");
      const pages = [...pick.selected].sort((a, b) => a - b);
      const parts: string[] = [];
      const empty: number[] = [];
      for (const [i, n] of pages.entries()) {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        setStatus(`Reading page ${n} (${i + 1} of ${pages.length})…`);
        const text = await doc.text(n);
        if (text === "") empty.push(n);
        parts.push(marks ? `--- Page ${n} ---\n${text}` : text);
        setProgress((i + 1) / pages.length);
      }
      const text = parts.filter((p) => p !== "").join("\n\n");
      const words = (text.replace(/--- Page \d+ ---/g, "").match(/\S+/g) ?? []).length;
      return { text, words, pages: pages.length, empty };
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
          <RangeField label="Pages to read" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy} className="sm:w-80"
            placeholder="All pages" hint="Leave empty for every page, or type page numbers and ranges." />
          <Checkbox checked={marks} onChange={(e) => { job.reset(); setMarks(e.target.checked); }} disabled={job.busy}>Add a line before each page, such as “--- Page 2 ---”</Checkbox>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label={job.status || "Working…"} value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={count === 0 || !!pick.rangeError} onClick={run}>Extract text</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{count === 0 ? "No pages are chosen." : `${count} of ${pageCount} ${noun(pageCount)}`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="text-result"
          fromTool="Extract text"
          nextSlugs={[]}
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="word-count">{result.words.toLocaleString("en")} {result.words === 1 ? "word" : "words"}</strong> from {result.pages - result.empty.length} of {result.pages} {noun(result.pages)}</p>}
        >
          <div className="grid gap-4">
            {result.empty.length > 0 && (
              <Alert tone="warn">
                {result.empty.length === result.pages
                  ? "This PDF has no text to extract. Its pages are probably pictures, such as scans."
                  : `${result.empty.length === 1 ? "Page" : "Pages"} ${formatRanges(result.empty)} ${result.empty.length === 1 ? "has" : "have"} no text and ${result.empty.length === 1 ? "is" : "are"} left out. ${result.empty.length === 1 ? "It is" : "They are"} probably ${result.empty.length === 1 ? "a picture" : "pictures"}, such as a scan.`}
                {" "}Reading text from pictures (OCR) is not built yet.
              </Alert>
            )}
            {result.text !== "" && <TextOutput text={result.text} label="Extracted text" filename={`${stem(file.name)}.txt`} />}
          </div>
        </ResultPanel>
      )}
    </div>
  );
}
