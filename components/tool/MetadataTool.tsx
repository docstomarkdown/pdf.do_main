"use client";

import { useEffect, useState } from "react";
import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { FactList } from "./ReportList";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { readMeta, writeMeta, type PdfFields } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

type Loaded = { fields: PdfFields; created: string; modified: string; hasXmp: boolean; pages: number };

const EMPTY: PdfFields = { title: "", author: "", subject: "", keywords: "", creator: "", producer: "" };
const LABELS: { key: keyof PdfFields; label: string; hint?: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords", hint: "Separated by commas or spaces, as you like." },
  { key: "creator", label: "Created with", hint: "The program that made the original." },
  { key: "producer", label: "Converted with", hint: "The program that last wrote the file." },
];

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" }) : "Not set");

/** Read the title, author and other document information of a PDF, change or clear it, and save a copy. */
export function MetadataTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [fields, setFields] = useState<PdfFields>(EMPTY);
  const job = useToolJob<{ file: File }>();
  useLeaveGuard(job.busy);

  useEffect(() => {
    const controller = new AbortController();
    file.arrayBuffer()
      .then((buffer) => readMeta(buffer, controller.signal))
      .then((r) => { setLoaded(r); setFields(r.fields); })
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setReadError(e instanceof Error ? e.message : "This file could not be read as a PDF."); });
    return () => controller.abort();
  }, [file]);

  const change = (key: keyof PdfFields, value: string) => { job.reset(); setFields((f) => ({ ...f, [key]: value })); };
  const anyText = Object.values(fields).some((v) => v.trim() !== "");

  function run() {
    void job.run(async ({ signal }) => {
      const r = await writeMeta(await file.arrayBuffer(), fields, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-edited.pdf`, { type: "application/pdf" }) };
    }, "Something went wrong.");
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={loaded?.pages} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !loaded && <p role="status" className="text-ink-2">Reading the document information…</p>}

      {loaded && !result && (
        <>
          {loaded.hasXmp && (
            <Alert tone="warn">
              This file also carries an XMP metadata block, which some programs show instead of these fields. It is left as it is: nothing here changes or removes it.
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {LABELS.map((l) => (
              <TextField key={l.key} label={l.label} hint={l.hint} value={fields[l.key]} onChange={(e) => change(l.key, e.target.value)} disabled={job.busy} />
            ))}
          </div>
          <FactList label="Dates in this file" facts={[{ label: "Created", value: day(loaded.created) }, { label: "Last changed", value: day(loaded.modified) }]} />
          <p className="hint">Dates are shown for your information and are not changed.</p>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Saving…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" onClick={run}>Save changes</Button>
                <Button variant="ghost" disabled={!anyText} onClick={() => { job.reset(); setFields(EMPTY); }}>Clear all fields</Button>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="metadata-result"
          url={result.url}
          file={result.file}
          fromTool="Edit PDF metadata"
          nextSlugs={["page-numbers", "rotate-pdf", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download edited PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong>Saved</strong> · {formatBytes(result.file.size)}{anyText ? "" : " · all fields cleared"}</p>}
        />
      )}
    </div>
  );
}
