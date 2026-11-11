"use client";

import { useMemo, useState } from "react";
import { AnchorGrid, ANCHOR_POINTS, type Anchor } from "./AnchorGrid";
import { FileCard } from "./FileCard";
import { FileDrop } from "./FileDrop";
import { NudgePad } from "./NudgePad";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { PlacementOverlay } from "./PlacementOverlay";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { placePicture } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { toPdfImage } from "@/lib/images";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useObjectUrls } from "@/lib/use-object-urls";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Where = "shown" | "all" | "pick";
type Picture = { file: File; jpeg: boolean; name: string };
const clamp = (n: number) => Math.min(100, Math.max(0, n));
const SMALLEST = 3;

/** Put a picture on the pages of a PDF: choose it, then place and size it on the preview. One picture per run. */
export function AddImageTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [pictureError, setPictureError] = useState("");
  const [at, setAt] = useState<{ x: number; y: number; width: number; anchor: Anchor | null }>({ x: 50, y: 50, width: 30, anchor: "mc" });
  const [where, setWhere] = useState<Where>("shown");
  const [previewPage, setPreviewPage] = useState(1);
  const job = useToolJob<{ file: File; placed: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);
  const blobs = useMemo(() => (picture ? [picture.file] : []), [picture]);
  const urls = useObjectUrls(blobs);
  const touch = () => job.reset();

  async function choose(files: File[]) {
    touch();
    const chosen = files[0];
    if (!chosen) return;
    try {
      // The same reading as Images to PDF: JPEG and PNG as they are, a turned phone photo upright, other formats as PNG.
      const ready = await toPdfImage(chosen);
      const type = ready.kind === "jpeg" ? "image/jpeg" : "image/png";
      setPicture({ file: new File([ready.buffer], chosen.name, { type }), jpeg: ready.kind === "jpeg", name: chosen.name });
      setPictureError("");
    } catch {
      setPicture(null);
      setPictureError(`${chosen.name} could not be opened as a picture in this browser. Try a JPEG or a PNG.`);
    }
  }

  const chosenPages = [...pick.selected].sort((a, b) => a - b);
  const pages = where === "all" ? Array.from({ length: pageCount }, (_, i) => i + 1) : where === "pick" ? chosenPages : [previewPage];
  const rangeProblem = where === "pick" && (!!pick.rangeError || pages.length === 0);

  function run() {
    void job.run(async ({ signal }) => {
      if (!picture) throw new Error("Choose a picture first.");
      const r = await placePicture(await file.arrayBuffer(), { image: await picture.file.arrayBuffer(), jpeg: picture.jpeg, x: at.x, y: at.y, width: at.width }, pages, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-with-picture.pdf`, { type: "application/pdf" }), placed: r.signed };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "page" : "pages");
  const onPages = where === "all" ? `On all ${pageCount} ${noun(pageCount)}` : where === "pick" ? `On ${pages.length} ${noun(pages.length)}` : `On page ${previewPage}`;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !doc && <p role="status" className="text-ink-2">Reading pages…</p>}

      {doc && !result && (
        <>
          {/* The page beside the picture chooser and its options from 680 px; below that they stack: choose, page, options. */}
          <div className="stage-split stage-split-3">
            <div className="stage-make grid gap-3">
              <FileDrop label={picture ? "Choose a different picture" : "Choose a picture"} accept="images" compact={!!picture} disabled={job.busy} onFiles={(f) => void choose(f)} />
              {picture && <p className="hint" style={{ marginTop: 0 }} data-testid="picture-name">{picture.name} · {formatBytes(picture.file.size)}</p>}
              {pictureError && <Alert tone="error">{pictureError}</Alert>}
            </div>
            <div className="stage-page">
              <PagePreview doc={doc} page={previewPage} onPage={setPreviewPage}>
                {urls[0] && (
                  <PlacementOverlay x={at.x} y={at.y} size={at.width} minSize={SMALLEST} maxSize={100} label="Picture"
                    onMove={(x, y) => { touch(); setAt((p) => ({ ...p, x, y, anchor: null })); }}
                    onResize={(width) => { touch(); setAt((p) => ({ ...p, width })); }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[0]} alt="" className="sigimg" draggable={false} data-testid="picture-preview" />
                  </PlacementOverlay>
                )}
              </PagePreview>
              {!picture && <p className="hint">Choose a picture and it appears on the page.</p>}
            </div>
            <div className="stage-rest grid gap-5">
              <div className="flex flex-wrap items-start gap-6">
                <AnchorGrid legend="Position" value={at.anchor} onChange={(a) => { touch(); setAt((p) => ({ ...p, ...ANCHOR_POINTS[a], anchor: a })); }} disabled={job.busy} />
                <NudgePad onNudge={(dx, dy) => { touch(); setAt((p) => ({ ...p, x: clamp(p.x + dx), y: clamp(p.y + dy), anchor: null })); }} />
              </div>
              <Slider label="Width" min={SMALLEST} max={100} value={Math.round(at.width)} onChange={(width) => { touch(); setAt((p) => ({ ...p, width })); }} format={(n) => `${n}% of the page`} />
              <Segmented<Where> legend="Put it on" name="picture-where" value={where} onChange={(w) => { touch(); setWhere(w); }} disabled={job.busy}
                options={[{ value: "shown", label: "This page" }, { value: "all", label: "Every page" }, { value: "pick", label: "Chosen pages" }]} />
              {where === "pick" && (
                <RangeField label="Pages" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy}
                  placeholder="All pages" hint="Type page numbers and ranges, such as 1-3, 5." />
              )}
              <p className="hint" data-testid="picture-position" style={{ marginTop: 0 }}>Centre at {Math.round(at.x)}% across and {Math.round(at.y)}% down, {Math.round(at.width)}% of the page wide.</p>
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Adding the picture…" sublabel="Your file and picture stay on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={!picture || rangeProblem} onClick={run}>Add picture</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{!picture ? "Choose a picture first." : rangeProblem ? "No pages are chosen." : onPages}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="picture-result"
          url={result.url}
          file={result.file}
          fromTool="Add image to PDF"
          nextSlugs={["add-watermark", "page-numbers", "compress-pdf"]}
          downloadLabel="Download PDF with the picture"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="picture-count">Picture added to {result.placed} {noun(result.placed)}</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone="info">The picture is now part of each page and cannot be taken off with this tool. Keep your original file.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
