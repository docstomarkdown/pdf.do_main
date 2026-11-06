"use client";

import { DownloadAll } from "./DownloadAll";
import { FileCard } from "./FileCard";
import { ImageGallery, type GalleryImage } from "./ImageGallery";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

const MIN_PX = 32;

/** Pull the pictures out of a PDF and save them as PNG files. Small pictures (icons, rules) are left out. */
export function ExtractImagesTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const job = useToolJob<{ images: GalleryImage[]; files: File[]; pages: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);
  const count = pick.selected.size;

  function run() {
    void job.run(async ({ signal, setProgress, setStatus }) => {
      if (!doc) throw new Error("This file could not be read as a PDF.");
      const pages = [...pick.selected].sort((a, b) => a - b);
      const images: GalleryImage[] = [];
      for (const [i, n] of pages.entries()) {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        setStatus(`Looking at page ${n} (${i + 1} of ${pages.length})…`);
        for (const found of await doc.images(n, MIN_PX)) {
          const id = images.length + 1;
          images.push({ id, label: `Picture ${id}`, detail: `Page ${n} · ${found.width} × ${found.height} · ${formatBytes(found.blob.size)}`, file: new File([found.blob], `${stem(file.name)}-picture-${String(id).padStart(3, "0")}.png`, { type: "image/png" }) });
        }
        setProgress((i + 1) / pages.length);
      }
      return { images, files: images.map((im) => im.file), pages: pages.length };
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
          <RangeField label="Pages to look at" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy} className="sm:w-80"
            placeholder="All pages" hint="Leave empty for every page, or type page numbers and ranges." />
          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label={job.status || "Working…"} value={job.progress} sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={count === 0 || !!pick.rangeError} onClick={run}>Extract pictures</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{count === 0 ? "No pages are chosen." : `${count} of ${pageCount} ${noun(pageCount)}`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="extract-images-result"
          fromTool="Extract images"
          nextSlugs={[]}
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="picture-count">{result.images.length} {result.images.length === 1 ? "picture" : "pictures"}</strong> from {result.pages} {noun(result.pages)}</p>}
        >
          {result.images.length === 0 ? (
            <Alert tone="info">No pictures of {MIN_PX} pixels or more were found on {result.pages === 1 ? "that page" : "those pages"}. Pages that are scans are one big picture; if this PDF was scanned, PDF to JPG saves the pages themselves.</Alert>
          ) : (
            <div className="grid gap-4">
              <p className="hint" style={{ marginTop: 0 }}>Pictures are saved as PNG, so a picture that was a JPEG in the file is larger here. A picture used on several pages appears once for each.</p>
              <ImageGallery images={result.images} label="Pictures from the PDF" />
              <DownloadAll files={result.files} zipName={`${stem(file.name)}-pictures`} />
            </div>
          )}
        </ResultPanel>
      )}
    </div>
  );
}
