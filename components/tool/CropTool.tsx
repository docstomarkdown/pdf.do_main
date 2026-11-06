"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { Slider } from "@/components/ui/Slider";
import { cropPdf, type CropMargins } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

const MAX = 45;
const NONE = { top: 0, right: 0, bottom: 0, left: 0 };

/** Cut the margins off pages. The preview shades what will go, and follows each slider. */
export function CropTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [margins, setMargins] = useState<CropMargins>(NONE);
  const [previewPage, setPreviewPage] = useState(1);
  const job = useToolJob<{ file: File; pages: number; cropped: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);

  const set = (side: keyof CropMargins) => (value: number) => { job.reset(); setMargins((m) => ({ ...m, [side]: value })); };
  const any = Object.values(margins).some((v) => v > 0);
  const count = pick.selected.size;

  function run() {
    void job.run(async ({ signal }) => {
      const fractions = { top: margins.top / 100, right: margins.right / 100, bottom: margins.bottom / 100, left: margins.left / 100 };
      const r = await cropPdf(await file.arrayBuffer(), fractions, [...pick.selected].sort((a, b) => a - b), signal);
      return { file: new File([r.bytes], `${stem(file.name)}-cropped.pdf`, { type: "application/pdf" }), pages: r.pages, cropped: r.cropped };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "page" : "pages");
  const percent = (n: number) => `${n}%`;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !doc && <p role="status" className="text-ink-2">Reading pages…</p>}

      {doc && !result && (
        <>
          <PagePreview doc={doc} page={previewPage} onPage={setPreviewPage}>
            <span className="crop-dim" style={{ top: 0, left: 0, right: 0, height: percent(margins.top) }} />
            <span className="crop-dim" style={{ bottom: 0, left: 0, right: 0, height: percent(margins.bottom) }} />
            <span className="crop-dim" style={{ top: percent(margins.top), bottom: percent(margins.bottom), left: 0, width: percent(margins.left) }} />
            <span className="crop-dim" style={{ top: percent(margins.top), bottom: percent(margins.bottom), right: 0, width: percent(margins.right) }} />
            <span className="crop-frame" data-testid="crop-frame" style={{ top: percent(margins.top), bottom: percent(margins.bottom), left: percent(margins.left), right: percent(margins.right) }} />
          </PagePreview>

          <div className="grid gap-4 sm:grid-cols-2">
            <Slider label="Top" min={0} max={MAX} value={margins.top} onChange={set("top")} format={percent} />
            <Slider label="Bottom" min={0} max={MAX} value={margins.bottom} onChange={set("bottom")} format={percent} />
            <Slider label="Left" min={0} max={MAX} value={margins.left} onChange={set("left")} format={percent} />
            <Slider label="Right" min={0} max={MAX} value={margins.right} onChange={set("right")} format={percent} />
          </div>
          <RangeField label="Pages to crop" value={pick.rangeText} onChange={pick.onRange} error={pick.rangeError} disabled={job.busy} className="sm:w-80"
            placeholder="All pages" hint="Leave empty for every page, or type page numbers and ranges." />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Cropping…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={!any || count === 0 || !!pick.rangeError} onClick={run}>Crop PDF</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{!any ? "Move a slider to choose what to cut off." : `${count} of ${pageCount} ${noun(pageCount)}`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="crop-result"
          url={result.url}
          file={result.file}
          fromTool="Crop PDF"
          nextSlugs={["rotate-pdf", "page-numbers", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download cropped PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="cropped-count">{result.cropped} {noun(result.cropped)} cropped</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone="warn">Cropping hides the area you cut off. It is still inside the file. Do not rely on it to remove anything private.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
