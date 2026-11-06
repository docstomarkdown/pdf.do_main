"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { FileDrop } from "./FileDrop";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { OptionCards } from "@/components/ui/OptionCards";
import { SizeComparison } from "@/components/ui/SizeComparison";
import { qpdfCompress } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { rasterCompress } from "@/lib/raster-compress";
import { COMPRESS_SIZES } from "@/lib/tools";
import { useHandoff } from "@/lib/use-handoff";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

type Mode = "smart" | "target";
type Result = { file: File; original: number; size: number; note: string; flattened: boolean };

const NEXT = ["merge-pdf", "delete-pdf-pages", "extract-pdf-pages"];
const TARGETS = [...COMPRESS_SIZES].sort((a, b) => a.bytes - b.bytes);

export function CompressTool({ presetBytes }: { presetBytes?: number }) {
  const { file: handed, from } = useHandoff();
  const [file, setFile] = useState<File | null>(handed);
  const [mode, setMode] = useState<Mode>(presetBytes ? "target" : "smart");
  const [target, setTarget] = useState(presetBytes ?? 200 * 1024);
  const job = useToolJob<Result>();
  useLeaveGuard(job.busy);

  const choose = (f: File) => { job.reset(); setFile(f); };

  function run() {
    if (!file) return;
    void job.run(async ({ signal, setStatus }) => {
      const original = await file.arrayBuffer();
      setStatus("Optimising structure and images…");
      const q = await qpdfCompress(original.slice(0), true, signal);
      let bytes = q.bytes;
      let note = "Structure and images optimised. Text stays selectable.";
      let flattened = false;

      if (mode === "target") {
        if (bytes.length <= target) {
          note = "Target reached by optimising structure and images. Text stays selectable.";
        } else {
          const r = await rasterCompress(original.slice(0), target, { onStatus: setStatus, signal });
          bytes = r.bytes;
          flattened = true;
          note = r.reached
            ? `Pages were converted to images (${r.dpi} dpi, quality ${Math.round(r.quality * 100)}) to reach the target. Text is no longer selectable.`
            : `Could not reach the target. This is the smallest result (${r.dpi} dpi, quality ${Math.round(r.quality * 100)}); text is no longer selectable.`;
        }
      } else if (bytes.length >= file.size) {
        bytes = new Uint8Array(original) as typeof bytes;
        note = "Smart mode could not shrink this file, so it is unchanged. Its images are probably already compressed JPEGs. Try Target size, which lowers image quality to reach a size you choose.";
      } else if (bytes.length > file.size * 0.97) {
        note = "Smart mode saved almost nothing: this PDF's images are probably already compressed JPEGs. Try Target size, which lowers image quality to reach a size you choose.";
      }

      const out = new File([bytes], `${stem(file.name)}-compressed.pdf`, { type: "application/pdf" });
      return { file: out, original: file.size, size: out.size, note, flattened };
    }, "Compression failed.");
  }

  const result = job.result;
  const saved = result ? Math.round((1 - result.size / result.original) * 100) : 0;

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDrop label="Choose a PDF" onFiles={(f) => choose(f[0])} />
      ) : (
        <>
          {from && <Alert tone="info">Carried over from {from}.</Alert>}
          <FileCard file={file} dim={job.busy} onReplace={choose} />
          <OptionCards
            legend="How should it be compressed?"
            name="mode"
            value={mode}
            onChange={setMode}
            disabled={job.busy}
            options={[
              { value: "smart", label: "Smart", description: "Smaller file, and text stays selectable." },
              { value: "target", label: "Target size", description: "Keeps going, even by turning pages into images, until it fits." },
            ]}
          />
          {mode === "target" && (
            <SelectField label="Make it at most" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={job.busy} className="max-w-xs">
              {TARGETS.map((t) => (<option key={t.bytes} value={t.bytes}>{t.label}</option>))}
            </SelectField>
          )}
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {file && !result && (
        <ActionBar>
          {job.busy ? (
            <div className="min-w-0 flex-1">
              <JobProgress label={job.status || "Working…"} sublabel="Your file stays on this device." onCancel={job.cancel} />
            </div>
          ) : (
            <Button size="lg" onClick={run}>Compress PDF</Button>
          )}
        </ActionBar>
      )}

      {result && file && (
        <ResultPanel
          testId="compress-result"
          url={result.url}
          file={result.file}
          fromTool="Compress PDF"
          nextSlugs={NEXT}
          downloadLabel="Download compressed PDF"
          onReset={job.reset}
          summary={
            <p className="text-lg">
              <span data-testid="size-before">{formatBytes(result.original)}</span> →{" "}
              <strong data-testid="size-after">{formatBytes(result.size)}</strong>{" "}
              <span className="font-semibold text-success-ink">({saved > 0 ? `${saved}% smaller` : "no saving"})</span>
            </p>
          }
        >
          <SizeComparison before={result.original} after={result.size} />
          {result.flattened && <p className="mt-3"><Badge tone="warn" icon="alert">Text not selectable</Badge></p>}
          <p data-testid="result-note" className={`note ${result.flattened ? "note-warn" : ""}`.trim()}>{result.note}</p>
        </ResultPanel>
      )}
    </div>
  );
}
