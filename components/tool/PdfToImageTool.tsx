"use client";

import { useState } from "react";
import { DownloadAll } from "./DownloadAll";
import { FileCard } from "./FileCard";
import { ImageGallery, type GalleryImage } from "./ImageGallery";
import { PagePicker } from "./PagePicker";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { SelectionToolbar } from "./SelectionToolbar";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { Segmented } from "@/components/ui/Segmented";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useThumbs } from "@/lib/use-thumbs";
import { useToolJob } from "@/lib/use-tool-job";

type Format = "jpg" | "png";
type Dpi = "72" | "150" | "300";

const TYPES = { jpg: "image/jpeg", png: "image/png" } as const;
/** Safari cannot hold a canvas bigger than about 16.7 million pixels, so a page past this is drawn smaller than asked. */
const MAX_PIXELS = 16_000_000;

/** Turn pages into pictures, as JPG or PNG, at a resolution you choose. The pictures come back with a ZIP. */
export function PdfToImageTool({ format }: { format: Format }) {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} format={format} />}</PdfTool>;
}

function Workspace({ file, from, onChoose, format }: { file: File; from?: string; onChoose: (file: File) => void; format: Format }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const { urls, request } = useThumbs(doc);
  const [dpi, setDpi] = useState<Dpi>("150");
  const job = useToolJob<{ images: GalleryImage[]; files: File[]; reduced: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);

  const count = pick.selected.size;
  const upper = format.toUpperCase();

  function run() {
    void job.run(async ({ signal, setProgress, setStatus }) => {
      if (!doc) throw new Error("This file could not be read as a PDF.");
      const pages = [...pick.selected].sort((a, b) => a - b);
      const pad = (n: number) => String(n).padStart(String(pageCount).length, "0");
      const images: GalleryImage[] = [];
      let reduced = 0;
      for (const [i, n] of pages.entries()) {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        setStatus(`Drawing page ${n} (${i + 1} of ${pages.length})…`);
        const size = await doc.pageSize(n);
        let width = Math.round((size.width / 72) * Number(dpi));
        const pixels = width * Math.round((size.height / size.width) * width);
        if (pixels > MAX_PIXELS) { width = Math.floor(width * Math.sqrt(MAX_PIXELS / pixels)); reduced++; }
        const canvas = document.createElement("canvas");
        await doc.render(n, canvas, width, { dpr: 1, signal });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, TYPES[format], 0.9));
        canvas.width = 0;
        if (!blob) throw new Error(`Page ${n} could not be saved as ${upper}.`);
        images.push({ id: n, file: new File([blob], `${stem(file.name)}-page-${pad(n)}.${format}`, { type: TYPES[format] }), label: `Page ${n}` });
        setProgress((i + 1) / pages.length);
      }
      return { images, files: images.map((im) => im.file), reduced };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "page" : "pages");

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && pageCount === 0 && <p role="status" className="text-ink-2">Reading pages…</p>}

      {pageCount > 0 && !result && (
        <>
          <Segmented<Dpi>
            legend="Resolution"
            name="pdf-to-image-dpi"
            value={dpi}
            onChange={(v) => { job.reset(); setDpi(v); }}
            disabled={job.busy}
            options={[{ value: "72", label: "Small · 72 dpi" }, { value: "150", label: "Standard · 150 dpi" }, { value: "300", label: "High · 300 dpi" }]}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <RangeField label="Pages to convert" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy} className="sm:w-80"
              placeholder="All pages" hint="Every page is chosen. Click pages below, or type page numbers and ranges." />
            <SelectionToolbar className="sm:pb-[1.9rem]" disabled={job.busy} onAll={pick.selectAll} onClear={pick.clear} onInvert={pick.invert} />
          </div>

          <PagePicker pageCount={pageCount} urls={urls} request={request} selected={pick.selected as Set<number>} onToggle={pick.toggle} tone="primary" />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label={job.status || "Working…"} value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={count === 0 || !!pick.rangeError} onClick={run}>
                  {count === 0 ? `Convert to ${upper}` : `Convert ${count} ${noun(count)} to ${upper}`}
                </Button>
                <p aria-live="polite" className="text-sm text-ink-2">{count === 0 ? "Select at least one page." : `${count} of ${pageCount} ${noun(pageCount)} selected`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="images-out-result"
          fromTool={`PDF to ${upper}`}
          nextSlugs={[]}
          onReset={() => job.reset()}
          summary={
            <p className="text-lg">
              <strong data-testid="image-count">{result.images.length} {result.images.length === 1 ? "picture" : "pictures"}</strong> · {formatBytes(result.files.reduce((n, f) => n + f.size, 0))}
            </p>
          }
        >
          <div className="grid gap-4">
            {result.reduced > 0 && (
              <Alert tone="info">
                {result.reduced} large {result.reduced === 1 ? "page was" : "pages were"} drawn at a lower resolution than you chose, so that this browser can hold the picture.
              </Alert>
            )}
            {format === "png" && <p className="hint" style={{ marginTop: 0 }}>Pages are drawn on white, so the pictures have no transparent areas.</p>}
            <ImageGallery images={result.images} label={`Pages as ${upper}`} />
            <DownloadAll files={result.files} zipName={`${stem(file.name)}-${format}`} />
          </div>
        </ResultPanel>
      )}
    </div>
  );
}
