"use client";

import { useEffect, useState } from "react";
import { AnchorGrid, ANCHOR_POINTS, type Anchor } from "./AnchorGrid";
import { FileCard } from "./FileCard";
import { NudgePad } from "./NudgePad";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { PlacementOverlay } from "./PlacementOverlay";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { watermarkPdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Ink = "grey" | "red" | "blue" | "black";
const INK: Record<Ink, { rgb: [number, number, number]; className: string; label: string }> = {
  grey: { rgb: [0.39, 0.45, 0.55], className: "wm-grey", label: "Grey" },
  red: { rgb: [0.86, 0.15, 0.15], className: "wm-red", label: "Red" },
  blue: { rgb: [0.15, 0.45, 0.93], className: "wm-blue", label: "Blue" },
  black: { rgb: [0.07, 0.09, 0.15], className: "wm-black", label: "Black" },
};
const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Write text across pages, such as DRAFT. Drag it on the preview, or place it with the grid and the arrow buttons. */
export function WatermarkTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [text, setText] = useState("CONFIDENTIAL");
  const [ink, setInk] = useState<Ink>("grey");
  const [size, setSize] = useState(64);
  const [opacity, setOpacity] = useState(30);
  const [rotation, setRotation] = useState(-45); // as seen: negative turns the text up to the right
  const [at, setAt] = useState<{ x: number; y: number; anchor: Anchor | null }>({ x: 50, y: 50, anchor: "mc" });
  const [previewPage, setPreviewPage] = useState(1);
  const [shape, setShape] = useState<{ n: number; width: number; height: number } | null>(null);
  const job = useToolJob<{ file: File; marked: number; replaced: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);
  const touch = () => job.reset();

  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(previewPage).then((s) => { if (alive) setShape({ n: previewPage, ...s }); });
    return () => { alive = false; };
  }, [doc, previewPage]);
  const current = shape && shape.n === previewPage ? shape : null;
  const count = pick.selected.size;
  const noText = text.trim() === "";

  function run() {
    void job.run(async ({ signal }) => {
      const mark = { text, size, opacity: opacity / 100, rotate: -rotation, color: INK[ink].rgb, x: at.x, y: at.y };
      const r = await watermarkPdf(await file.arrayBuffer(), mark, [...pick.selected].sort((a, b) => a - b), signal);
      return { file: new File([r.bytes], `${stem(file.name)}-watermarked.pdf`, { type: "application/pdf" }), marked: r.marked, replaced: r.replaced };
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
          <PagePreview doc={doc} page={previewPage} onPage={setPreviewPage}>
            {!noText && current && (
              <PlacementOverlay x={at.x} y={at.y} rotate={rotation} label="Watermark"
                onMove={(x, y) => { touch(); setAt({ x, y, anchor: null }); }}>
                <span className={`wm-text ${INK[ink].className}`} data-testid="watermark-text" style={{ fontSize: `${(size / current.width) * 100}cqw`, opacity: opacity / 100 }}>{text}</span>
              </PlacementOverlay>
            )}
          </PagePreview>
          <p className="hint" style={{ marginTop: "-0.75rem" }} data-testid="watermark-position">Centre at {Math.round(at.x)}% across and {Math.round(at.y)}% down.</p>

          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="flex flex-wrap items-start gap-6">
              <AnchorGrid legend="Position" value={at.anchor} onChange={(a) => { touch(); setAt({ ...ANCHOR_POINTS[a], anchor: a }); }} disabled={job.busy} />
              <NudgePad onNudge={(dx, dy) => { touch(); setAt((p) => ({ x: clamp(p.x + dx), y: clamp(p.y + dy), anchor: null })); }} />
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <TextField label="Text" value={text} onChange={(e) => { touch(); setText(e.target.value); }} error={noText ? "Type the text for the watermark." : undefined} disabled={job.busy} className="sm:col-span-2" maxLength={60} />
              <Segmented<Ink> legend="Colour" name="watermark-ink" value={ink} onChange={(v) => { touch(); setInk(v); }} disabled={job.busy}
                options={(Object.keys(INK) as Ink[]).map((k) => ({ value: k, label: INK[k].label }))} className="sm:col-span-2" />
              <Slider label="Size" min={16} max={160} value={size} onChange={(v) => { touch(); setSize(v); }} format={(n) => `${n} pt`} />
              <Slider label="Strength" min={5} max={100} value={opacity} onChange={(v) => { touch(); setOpacity(v); }} format={(n) => `${n}%`} />
              <Slider label="Angle" min={-90} max={90} step={5} value={rotation} onChange={(v) => { touch(); setRotation(v); }} format={(n) => `${n}°`} />
              <RangeField label="Pages to mark" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy}
                placeholder="All pages" hint="Leave empty for every page, or type page numbers and ranges." />
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Adding the watermark…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={noText || count === 0 || !!pick.rangeError} onClick={run}>Add watermark</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{count === 0 ? "No pages are chosen." : `${count} of ${pageCount} ${noun(pageCount)}`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="watermark-result"
          url={result.url}
          file={result.file}
          fromTool="Add watermark"
          nextSlugs={["page-numbers", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download watermarked PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="marked-count">{result.marked} {noun(result.marked)} marked</strong> · {formatBytes(result.file.size)}</p>}
        >
          {result.replaced > 0 && <Alert tone="warn">{result.replaced} {result.replaced === 1 ? "character is" : "characters are"} not in the PDF font used here, which covers Latin letters only, and {result.replaced === 1 ? "shows" : "show"} as “?”.</Alert>}
        </ResultPanel>
      )}
    </div>
  );
}
