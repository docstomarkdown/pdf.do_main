"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { MultiResult, type OutputFile } from "./MultiResult";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { splitBySize } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

const UNITS = { KB: 1024, MB: 1024 * 1024 } as const;

/** Split a PDF into files that are each no bigger than a size you choose, keeping the pages in order. */
export function SplitBySizeTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<keyof typeof UNITS>("MB");
  const job = useToolJob<{ outputs: OutputFile[]; total: number; over: number }>();
  useLeaveGuard(job.busy);

  const limit = Math.round(Number(amount) * UNITS[unit]);
  const problem = !(Number(amount) > 0) ? "Type a size, such as 1." : limit < 20 * 1024 ? "The smallest limit is 20 KB." : undefined;

  function run() {
    void job.run(async ({ signal, setProgress }) => {
      const r = await splitBySize(await file.arrayBuffer(), limit, setProgress, signal);
      const pad = (n: number) => String(n).padStart(String(r.files.length).length, "0");
      const outputs: OutputFile[] = r.files.map((f, i) => ({
        id: i + 1,
        file: new File([f.bytes], `${stem(file.name)}-part-${pad(i + 1)}.pdf`, { type: "application/pdf" }),
        detail: `${f.pages} ${f.pages === 1 ? "page" : "pages"}, ${f.first === f.last ? `page ${f.first}` : `pages ${f.first} to ${f.last}`} · ${formatBytes(f.bytes.length)}${f.over ? " · over the limit" : ""}`,
      }));
      return { outputs, total: r.total, over: r.files.filter((f) => f.over).length };
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
          <div className="flex flex-wrap items-start gap-3">
            <TextField label="Largest file" inputMode="decimal" value={amount} onChange={(e) => { job.reset(); setAmount(e.target.value); }} error={problem} disabled={job.busy} className="w-40" />
            <SelectField label="Unit" value={unit} onChange={(e) => { job.reset(); setUnit(e.target.value as keyof typeof UNITS); }} disabled={job.busy} className="w-28">
              <option value="KB">KB</option><option value="MB">MB</option>
            </SelectField>
          </div>
          <p className="hint" style={{ marginTop: "-0.75rem" }}>Pages are packed in order, as many to a file as fit. This file is {formatBytes(file.size)} in {pageCount} {pageCount === 1 ? "page" : "pages"}.</p>
          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Splitting…" value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <Button size="lg" disabled={!!problem} onClick={run}>Split PDF</Button>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel testId="by-size-result" fromTool="Split PDF by size" nextSlugs={[]} onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="by-size-count">{result.outputs.length} {result.outputs.length === 1 ? "file" : "files"}</strong> from {result.total} {result.total === 1 ? "page" : "pages"}</p>}>
          <div className="grid gap-4">
            {result.over > 0 && <Alert tone="warn">{result.over} {result.over === 1 ? "page is" : "pages are"} bigger than the limit on {result.over === 1 ? "its" : "their"} own, so {result.over === 1 ? "it has" : "each has"} a file to {result.over === 1 ? "itself" : "itself"} and {result.over === 1 ? "is" : "are"} marked.</Alert>}
            <MultiResult outputs={result.outputs} zipName={`${stem(file.name)}-by-size`} />
          </div>
        </ResultPanel>
      )}
    </div>
  );
}
