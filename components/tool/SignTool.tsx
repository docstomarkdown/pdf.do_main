"use client";

import { useCallback, useState } from "react";
import { ANCHOR_POINTS, AnchorGrid, type Anchor } from "./AnchorGrid";
import { FileCard } from "./FileCard";
import { NudgePad } from "./NudgePad";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { PlacementOverlay } from "./PlacementOverlay";
import { ResultPanel } from "./ResultPanel";
import { SignatureMaker, type MadeSignature } from "./SignatureMaker";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { Segmented } from "@/components/ui/Segmented";
import { signPdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useObjectUrls } from "@/lib/use-object-urls";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Where = "shown" | "all" | "last";
const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Put a picture of your signature on a page: draw it, type it or upload it, then place and size it on the preview. */
export function SignTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [signature, setSignature] = useState<MadeSignature | null>(null);
  const [at, setAt] = useState<{ x: number; y: number; width: number; anchor: Anchor | null }>({ x: 70, y: 85, width: 28, anchor: null });
  const [where, setWhere] = useState<Where>("shown");
  const [previewPage, setPreviewPage] = useState(1);
  const job = useToolJob<{ file: File; signed: number }>();
  useLeaveGuard(job.busy);
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const urls = useObjectUrls(blobs);
  const { reset } = job; // stable, unlike `job` itself: the signature box must not be rebuilt on every render
  const made = useCallback((s: MadeSignature | null) => { setSignature(s); setBlobs(s ? [s.file] : []); reset(); }, [reset]);

  function run() {
    void job.run(async ({ signal }) => {
      if (!signature) throw new Error("Make your signature first.");
      const pages = where === "all" ? Array.from({ length: pageCount }, (_, i) => i + 1) : where === "last" ? [pageCount] : [previewPage];
      const r = await signPdf(await file.arrayBuffer(), { image: await signature.file.arrayBuffer(), jpeg: signature.jpeg, x: at.x, y: at.y, width: at.width }, pages, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-signed.pdf`, { type: "application/pdf" }), signed: r.signed };
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
          {/* The page beside the signature box and its options from 680 px. Below that they stack in the same order as
              before: make, page, options. The order in the page's markup is that order at every width. */}
          <div className="stage-split stage-split-3">
            <div className="stage-make"><SignatureMaker onChange={made} /></div>
            <div className="stage-page">
              <PagePreview doc={doc} page={previewPage} onPage={setPreviewPage}>
                {urls[0] && (
                  <PlacementOverlay x={at.x} y={at.y} size={at.width} minSize={6} maxSize={80} label="Signature"
                    onMove={(x, y) => { job.reset(); setAt((p) => ({ ...p, x, y, anchor: null })); }}
                    onResize={(width) => { job.reset(); setAt((p) => ({ ...p, width })); }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[0]} alt="" className="sigimg" draggable={false} data-testid="signature-preview" />
                  </PlacementOverlay>
                )}
              </PagePreview>
              {!urls[0] && <p className="hint">Make your signature and it appears on the page.</p>}
            </div>
            <div className="stage-rest">
              <div className="flex flex-wrap items-start gap-6">
                <AnchorGrid legend="Position" value={at.anchor} onChange={(a) => { job.reset(); setAt((p) => ({ ...p, ...ANCHOR_POINTS[a], anchor: a })); }} disabled={job.busy} />
                <NudgePad onNudge={(dx, dy) => { job.reset(); setAt((p) => ({ ...p, x: clamp(p.x + dx), y: clamp(p.y + dy), anchor: null })); }} />
                <Segmented<Where> legend="Sign" name="sign-where" value={where} onChange={(w) => { job.reset(); setWhere(w); }} disabled={job.busy}
                  options={[{ value: "shown", label: "This page" }, { value: "last", label: "Last page" }, { value: "all", label: "Every page" }]} />
              </div>
              <p className="hint" data-testid="signature-position">Centre at {Math.round(at.x)}% across and {Math.round(at.y)}% down, {Math.round(at.width)}% of the page wide.</p>
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Adding your signature…" sublabel="Your file and signature stay on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={!signature} onClick={run}>Add signature</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{signature ? `On ${where === "all" ? `all ${pageCount} pages` : where === "last" ? `page ${pageCount}` : `page ${previewPage}`}` : "Make your signature first."}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="sign-result"
          url={result.url}
          file={result.file}
          fromTool="Sign PDF"
          nextSlugs={["page-numbers", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download signed PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="signed-count">{result.signed} {noun(result.signed)} signed</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone="info">This puts a picture of your signature on the page. It is not a digital signature: it carries no certificate and cannot show whether the file was changed afterwards.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
