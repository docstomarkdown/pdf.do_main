"use client";

import { useEffect, useRef, useState } from "react";
import { FileDrop } from "./FileDrop";
import { ResultPanel } from "./ResultPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { OptionCards } from "@/components/ui/OptionCards";
import { Progress } from "@/components/ui/Progress";
import { qpdfCompress } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { clearHandoff, peekHandoff } from "@/lib/handoff";
import { rasterCompress } from "@/lib/raster-compress";
import { COMPRESS_SIZES } from "@/lib/tools";

type Mode = "smart" | "target";
type Result = { url: string; file: File; original: number; size: number; note: string };

const NEXT = ["merge-pdf", "delete-pdf-pages", "extract-pdf-pages"];
const TARGETS = [...COMPRESS_SIZES].sort((a, b) => a.bytes - b.bytes);

export function CompressTool({ presetBytes }: { presetBytes?: number }) {
  const [file, setFile] = useState<File | null>(() => peekHandoff()?.file ?? null);
  const [from] = useState(() => peekHandoff()?.from);
  const [mode, setMode] = useState<Mode>(presetBytes ? "target" : "smart");
  const [target, setTarget] = useState(presetBytes ?? 200 * 1024);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    clearHandoff();
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, []);

  const reset = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setResult(null);
    setError(null);
  };

  async function run() {
    if (!file) return;
    reset();
    setBusy(true);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const original = await file.arrayBuffer();
      setStatus("Optimising structure and images…");
      const q = await qpdfCompress(original.slice(0), true, abort.signal);
      let bytes = q.bytes;
      let note = "Structure and images optimised. Text stays selectable.";

      if (mode === "target") {
        if (bytes.length <= target) {
          note = "Target reached by optimising structure and images. Text stays selectable.";
        } else {
          const r = await rasterCompress(original.slice(0), target, { onStatus: setStatus, signal: abort.signal });
          bytes = r.bytes;
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
      const url = URL.createObjectURL(out);
      urlRef.current = url;
      setResult({ url, file: out, original: file.size, size: out.size, note });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Compression failed.");
      }
    } finally {
      setBusy(false);
      setStatus("");
      abortRef.current = null;
    }
  }

  const saved = result ? Math.round((1 - result.size / result.original) * 100) : 0;
  const afterPct = result ? Math.max(2, Math.min(100, (result.size / result.original) * 100)) : 0;

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDrop label="Choose a PDF" onFiles={(f) => { reset(); setFile(f[0]); }} />
      ) : (
        <>
          {from && <Alert tone="info">Carried over from {from}.</Alert>}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Icon name="file" className="h-6 w-6 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-600">{formatBytes(file.size)}</p>
              </div>
            </div>
            <FileDrop compact label="Choose a different file" onFiles={(f) => { reset(); setFile(f[0]); }} />
          </div>

          <OptionCards
            legend="How should it be compressed?"
            name="mode"
            value={mode}
            onChange={setMode}
            disabled={busy}
            options={[
              { value: "smart", label: "Smart", description: "Smaller file, and text stays selectable." },
              { value: "target", label: "Target size", description: "Keeps going, even by turning pages into images, until it fits." },
            ]}
          />
          {mode === "target" && (
            <SelectField label="Make it at most" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={busy} className="max-w-xs">
              {TARGETS.map((t) => (<option key={t.bytes} value={t.bytes}>{t.label}</option>))}
            </SelectField>
          )}
        </>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      {busy && <Progress label={status || "Working…"} onCancel={() => abortRef.current?.abort()} />}

      {file && !result && (
        <Button size="lg" disabled={busy} onClick={run} className="w-full sm:w-auto">{busy ? "Compressing…" : "Compress PDF"}</Button>
      )}

      {result && file && (
        <ResultPanel
          testId="compress-result"
          url={result.url}
          file={result.file}
          fromTool="Compress PDF"
          nextSlugs={NEXT}
          downloadLabel="Download compressed PDF"
          onReset={() => { reset(); }}
          summary={
            <p className="text-lg">
              <span data-testid="size-before">{formatBytes(result.original)}</span> →{" "}
              <strong data-testid="size-after">{formatBytes(result.size)}</strong>{" "}
              <span className="font-semibold text-emerald-800">({saved > 0 ? `${saved}% smaller` : "no saving"})</span>
            </p>
          }
        >
          <div aria-hidden="true" className="space-y-2 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-3"><span className="w-12 shrink-0">Before</span><div className="h-2.5 flex-1 rounded-full bg-slate-400" /></div>
            <div className="flex items-center gap-3"><span className="w-12 shrink-0">After</span><div className="flex-1"><div className="h-2.5 rounded-full bg-emerald-700" style={{ width: `${afterPct}%` }} /></div></div>
          </div>
          <p data-testid="result-note" className="mt-3 text-sm text-slate-800">{result.note}</p>
        </ResultPanel>
      )}
    </div>
  );
}
