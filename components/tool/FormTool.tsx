"use client";

import { useEffect, useState } from "react";
import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { fillForm, readForm, type FormField } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

/** Fill in the form fields of a PDF (text, tick boxes, choices) and save a copy, with the entries kept as fields or made permanent. */
export function FormTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const [fields, setFields] = useState<FormField[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);
  const job = useToolJob<{ file: File; changed: number }>();
  useLeaveGuard(job.busy);

  useEffect(() => {
    const controller = new AbortController();
    file.arrayBuffer()
      .then((buffer) => readForm(buffer, controller.signal))
      .then((r) => { setFields(r.fields); setValues(Object.fromEntries(r.fields.map((f) => [f.name, f.value]))); })
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setReadError(e instanceof Error ? e.message : "This file could not be read as a PDF."); });
    return () => controller.abort();
  }, [file]);

  const set = (name: string, value: string | boolean) => { job.reset(); setValues((v) => ({ ...v, [name]: value })); };
  const editable = (fields ?? []).filter((f) => f.kind !== "other");

  function run() {
    void job.run(async ({ signal }) => {
      const r = await fillForm(await file.arrayBuffer(), values, flatten, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-filled.pdf`, { type: "application/pdf" }), changed: r.changed };
    }, "Something went wrong.");
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && fields === null && <p role="status" className="text-ink-2">Looking for form fields…</p>}
      {fields && editable.length === 0 && !readError && (
        <Alert tone="info">This PDF has no fillable form fields. Many forms are only a picture of a form, with nothing to type into. Sign PDF and Add watermark can put text or a signature on any page.</Alert>
      )}

      {editable.length > 0 && !result && (
        <>
          <p className="text-ink-2" data-testid="form-count">{editable.length} {editable.length === 1 ? "field" : "fields"} found.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {editable.map((f) => {
              const value = values[f.name];
              const common = { disabled: job.busy || f.readOnly };
              const hint = f.readOnly ? "This field is read-only." : undefined;
              if (f.kind === "check") return <Checkbox key={f.name} checked={value === true} onChange={(e) => set(f.name, e.target.checked)} {...common}>{f.name}</Checkbox>;
              if (f.kind === "radio" || f.kind === "choice") {
                return (
                  <SelectField key={f.name} label={f.name} hint={hint} value={String(value ?? "")} onChange={(e) => set(f.name, e.target.value)} {...common}>
                    <option value="">Not chosen</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </SelectField>
                );
              }
              return f.multiline
                ? <TextArea key={f.name} label={f.name} hint={hint} rows={4} value={String(value ?? "")} onChange={(e) => set(f.name, e.target.value)} className="sm:col-span-2" {...common} />
                : <TextField key={f.name} label={f.name} hint={hint} value={String(value ?? "")} onChange={(e) => set(f.name, e.target.value)} {...common} />;
            })}
          </div>
          <Checkbox checked={flatten} onChange={(e) => { job.reset(); setFlatten(e.target.checked); }} disabled={job.busy}>Make the entries permanent (the fields can no longer be changed)</Checkbox>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Filling the form…" sublabel="Your file and answers stay on this device." onCancel={job.cancel} /></div>
            ) : (
              <Button size="lg" onClick={run}>Save filled PDF</Button>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error.includes("encode") || job.error.includes("WinAnsi") ? "A field holds a character the form's font cannot show. Remove accents or symbols that are not Latin letters, or try again without them." : job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="form-result"
          url={result.url}
          file={result.file}
          fromTool="Fill PDF form"
          nextSlugs={["sign-pdf", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download filled PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong>Saved</strong> · {formatBytes(result.file.size)}{flatten ? " · entries made permanent" : ""}</p>}
        />
      )}
    </div>
  );
}
