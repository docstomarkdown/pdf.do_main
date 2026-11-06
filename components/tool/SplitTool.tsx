"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { MultiResult, type OutputFile } from "./MultiResult";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { OptionCards } from "@/components/ui/OptionCards";
import { splitPdf } from "@/lib/engines";
import { stem } from "@/lib/format";
import { parseGroups } from "@/lib/ranges";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Mode = "every" | "ranges" | "chunks";

const MAX_FILES = 500;

/** Split one PDF into several: a file per page, a file per range you type, or equal parts. The files come back with a ZIP. */
export function SplitTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [mode, setMode] = useState<Mode>("every");
  const [ranges, setRanges] = useState("");
  const [size, setSize] = useState("2");
  const job = useToolJob<{ outputs: OutputFile[]; total: number }>();
  useLeaveGuard(job.busy);

  // What each mode would make, worked out as the person types, so the button can say how many files it will make.
  let groups: number[][] = [];
  let problem: string | undefined;
  if (pageCount > 0) {
    if (mode === "every") {
      groups = Array.from({ length: pageCount }, (_, i) => [i + 1]);
    } else if (mode === "ranges") {
      const parsed = parseGroups(ranges, pageCount);
      groups = parsed.groups;
      problem = parsed.error;
    } else {
      const n = Number(size);
      if (!Number.isInteger(n) || n < 1) problem = "Type a whole number of pages, such as 2.";
      else groups = Array.from({ length: Math.ceil(pageCount / n) }, (_, i) => Array.from({ length: Math.min(n, pageCount - i * n) }, (_, j) => i * n + j + 1));
    }
    if (!problem && groups.length > MAX_FILES) problem = `That would make ${groups.length} files. The most is ${MAX_FILES}.`;
  }
  const count = groups.length;

  const pad = (n: number) => String(n).padStart(String(pageCount).length, "0");
  const nameOf = (g: { first: number; last: number }) => `${stem(file.name)}-${g.first === g.last ? `page-${pad(g.first)}` : `pages-${pad(g.first)}-${pad(g.last)}`}.pdf`;

  function run() {
    void job.run(async ({ signal, setProgress }) => {
      const r = await splitPdf(await file.arrayBuffer(), groups, setProgress, signal);
      const outputs: OutputFile[] = r.files.map((f, i) => ({
        id: i + 1,
        file: new File([f.bytes], nameOf(f), { type: "application/pdf" }),
        detail: `${f.pages} ${f.pages === 1 ? "page" : "pages"}${f.first === f.last ? `, page ${f.first}` : `, pages ${f.first} to ${f.last}`}`,
      }));
      return { outputs, total: r.total };
    }, "Something went wrong.");
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !doc && <p role="status" className="text-ink-2">Reading pages…</p>}

      {doc && !result && (
        <>
          <OptionCards<Mode>
            legend="How to split"
            name="split-mode"
            value={mode}
            onChange={(m) => { job.reset(); setMode(m); }}
            disabled={job.busy}
            options={[
              { value: "every", label: "Every page", description: "One file for each page." },
              { value: "ranges", label: "Ranges", description: "Type which pages go together, such as 1-3, 4-6." },
              { value: "chunks", label: "Equal parts", description: "A new file every few pages." },
            ]}
          />
          {mode === "ranges" && (
            <TextField
              label="Pages for each file"
              placeholder="e.g. 1-3, 4-6, 9"
              value={ranges}
              onChange={(e) => { job.reset(); setRanges(e.target.value); }}
              error={problem}
              hint="Each comma makes one file: 1-3, 4-6 makes two."
              disabled={job.busy}
              className="sm:w-96"
            />
          )}
          {mode === "chunks" && (
            <TextField
              label="Pages in each file"
              inputMode="numeric"
              value={size}
              onChange={(e) => { job.reset(); setSize(e.target.value); }}
              error={problem}
              hint={`The last file holds whatever is left of the ${pageCount} pages.`}
              disabled={job.busy}
              className="sm:w-60"
            />
          )}
          {mode === "every" && problem && <Alert tone="error">{problem}</Alert>}

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Splitting…" value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={count === 0 || !!problem} onClick={run}>
                  {count === 0 || problem ? "Split PDF" : `Split into ${count} ${count === 1 ? "file" : "files"}`}
                </Button>
                <p aria-live="polite" className="text-sm text-ink-2">
                  {mode === "ranges" && count === 0 && !problem ? "Type the pages for each file." : `${pageCount} ${pageCount === 1 ? "page" : "pages"} in this PDF`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="split-result"
          fromTool="Split PDF"
          nextSlugs={[]}
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="split-count">{result.outputs.length} {result.outputs.length === 1 ? "file" : "files"}</strong> from {result.total} {result.total === 1 ? "page" : "pages"}</p>}
        >
          <MultiResult outputs={result.outputs} zipName={`${stem(file.name)}-split`} />
        </ResultPanel>
      )}
    </div>
  );
}
