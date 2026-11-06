"use client";

import { useEffect, useState } from "react";
import { FileCard } from "./FileCard";
import { MultiResult, type OutputFile } from "./MultiResult";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { TextLink } from "@/components/ui/TextLink";
import { splitPdf } from "@/lib/engines";
import { stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";
import { safeEntryName } from "@/lib/zip-names";

type Section = { title: string; first: number; last: number };

/** Split a PDF at its top-level bookmarks: each bookmark starts a file that runs to the next one. */
export function SplitBookmarksTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [marks, setMarks] = useState<{ title: string; page: number }[] | null>(null);
  const job = useToolJob<{ outputs: OutputFile[]; total: number }>();
  useLeaveGuard(job.busy);

  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.outline().then((m) => { if (alive) setMarks(m); }).catch(() => { if (alive) setMarks([]); });
    return () => { alive = false; };
  }, [doc]);

  // Sections: one per bookmark, in page order, each running to the page before the next. Pages before the first bookmark are a section too.
  const sections: Section[] = [];
  if (marks && marks.length > 0 && pageCount > 0) {
    const starts: { title: string; page: number }[] = [];
    for (const m of [...marks].sort((a, b) => a.page - b.page)) if (!starts.some((s) => s.page === m.page)) starts.push(m);
    if (starts[0].page > 1) starts.unshift({ title: "Before the first bookmark", page: 1 });
    starts.forEach((s, i) => sections.push({ title: s.title, first: s.page, last: i + 1 < starts.length ? starts[i + 1].page - 1 : pageCount }));
  }

  function run() {
    void job.run(async ({ signal, setProgress }) => {
      const r = await splitPdf(await file.arrayBuffer(), sections.map((s) => Array.from({ length: s.last - s.first + 1 }, (_, i) => s.first + i)), setProgress, signal);
      const pad = (n: number) => String(n).padStart(String(sections.length).length, "0");
      const outputs: OutputFile[] = r.files.map((f, i) => ({
        id: i + 1,
        file: new File([f.bytes], `${stem(file.name)}-${pad(i + 1)}-${safeEntryName(sections[i].title.replace(/[\\/]+/g, "-")).slice(0, 50)}.pdf`, { type: "application/pdf" }),
        detail: `${f.pages} ${f.pages === 1 ? "page" : "pages"}, ${f.first === f.last ? `page ${f.first}` : `pages ${f.first} to ${f.last}`}`,
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
      {!readError && (!doc || marks === null) && <p role="status" className="text-ink-2">Reading the bookmarks…</p>}
      {marks && marks.length === 0 && !readError && (
        <Alert tone="info">This PDF has no bookmarks to split at. <TextLink href="/split-pdf">Split PDF</TextLink> cuts by page numbers instead.</Alert>
      )}

      {sections.length > 0 && !result && (
        <>
          <div>
            <h2 className="mb-2 text-lg font-bold">{sections.length} {sections.length === 1 ? "file" : "files"} from the top-level bookmarks</h2>
            <ul aria-label="Files this will make" className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-surface">
              {sections.map((s, i) => (
                <li key={`${s.first}-${i}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 truncate font-medium">{s.title}</span>
                  <span className="shrink-0 text-sm text-ink-3">{s.first === s.last ? `page ${s.first}` : `pages ${s.first} to ${s.last}`}</span>
                </li>
              ))}
            </ul>
            <p className="hint">Only the top level of the bookmarks is used. Bookmarks nested inside another do not start a new file.</p>
          </div>
          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Splitting…" value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <Button size="lg" onClick={run}>Split into {sections.length} {sections.length === 1 ? "file" : "files"}</Button>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel testId="bookmarks-result" fromTool="Split PDF by bookmarks" nextSlugs={[]} onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="bookmarks-count">{result.outputs.length} {result.outputs.length === 1 ? "file" : "files"}</strong> from {result.total} {result.total === 1 ? "page" : "pages"}</p>}>
          <MultiResult outputs={result.outputs} zipName={`${stem(file.name)}-chapters`} />
        </ResultPanel>
      )}
    </div>
  );
}
