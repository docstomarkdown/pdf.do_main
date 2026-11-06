"use client";

import { useMemo, useState } from "react";
import { FileDrop } from "./FileDrop";
import { FileList, type FileItem } from "./FileList";
import { PageSetup, toPageSetup, type SetupValue } from "./PageSetup";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { imagesToPdf, type ImagePage } from "@/lib/engines";
import { formatBytes } from "@/lib/format";
import { readImageSize, toPdfImage } from "@/lib/images";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useObjectUrls } from "@/lib/use-object-urls";
import { useToolJob } from "@/lib/use-tool-job";

type Item = { id: number; file: File; width?: number; height?: number; error?: string };

let serial = 0;

/**
 * Put pictures on pages, one picture per page, in the order you choose. The `scan` variant opens the phone's camera first and is
 * made for photographing paper; the `heic` variant is for iPhone photos, which only some browsers (Safari) can open.
 */
export function ImagesToPdfTool({ variant = "images" }: { variant?: "images" | "scan" | "heic" }) {
  const [items, setItems] = useState<Item[]>([]);
  const [setup, setSetup] = useState<SetupValue>({ size: "a4", orientation: "auto", margin: "small" });
  const files = useMemo(() => items.map((i) => i.file), [items]);
  const urls = useObjectUrls(files);
  const job = useToolJob<{ file: File; pages: number }>();
  useLeaveGuard(job.busy);

  function add(list: File[]) {
    job.reset();
    const fresh = list.map((file) => ({ id: ++serial, file }));
    setItems((prev) => [...prev, ...fresh]);
    for (const item of fresh) {
      readImageSize(item.file)
        .then(({ width, height }) => setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, width, height } : p))))
        .catch(() => setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, error: /\.hei[cf]$/i.test(item.file.name) || /hei[cf]/i.test(item.file.type) ? "This browser cannot open HEIC photos. Safari on an iPhone or Mac can; elsewhere, share the photo as a JPEG first." : "This file could not be read as an image." } : p))));
    }
  }

  const usable = items.filter((i) => !i.error);
  const reading = items.some((i) => !i.error && i.width === undefined);
  const rows: FileItem[] = items.map((i, index) => ({
    id: i.id,
    file: i.file,
    error: i.error,
    detail: i.width ? `${i.width} × ${i.height} · ${formatBytes(i.file.size)}` : undefined,
    thumb: urls[index],
  }));

  function run() {
    void job.run(async ({ signal, setStatus, setProgress }) => {
      setStatus("Reading the images…");
      const pictures: ImagePage[] = [];
      for (const item of usable) {
        pictures.push(await toPdfImage(item.file));
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      }
      setStatus("Making the PDF…");
      const r = await imagesToPdf(pictures, toPageSetup(setup), setProgress, signal);
      return { file: new File([r.bytes], "images.pdf", { type: "application/pdf" }), pages: r.pages };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "image" : "images");

  return (
    <div className="space-y-6">
      {items.length === 0 && variant === "scan" && (
        <div className="grid gap-3">
          <FileDrop label="Take a photo of a page" accept="images" capture onFiles={add} />
          <FileDrop compact label="Choose images instead" accept="images" multiple onFiles={add} />
          <p className="hint" style={{ marginTop: 0 }}>On a phone, the first button opens the camera. On a computer it opens the file chooser.</p>
        </div>
      )}
      {items.length === 0 && variant !== "scan" && <FileDrop label={variant === "heic" ? "Choose HEIC photos" : "Choose images"} accept="images" multiple onFiles={add} />}

      {items.length > 0 && !result && (
        <>
          <FileList
            items={rows}
            onMove={(index, delta) => { job.reset(); setItems((prev) => { const next = [...prev]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; }); }}
            onRemove={(id) => { job.reset(); setItems((prev) => prev.filter((i) => i.id !== id)); }}
          />
          <div className="flex flex-wrap gap-2">
            {variant === "scan" && <FileDrop compact label="Take another photo" accept="images" capture disabled={job.busy} onFiles={add} />}
            <FileDrop compact label={variant === "scan" ? "Add images" : "Add more images"} accept="images" multiple disabled={job.busy} onFiles={add} />
          </div>
          <PageSetup value={setup} onChange={(v) => { job.reset(); setSetup(v); }} disabled={job.busy} />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label={job.status || "Working…"} value={job.progress} sublabel="Your images stay on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={usable.length === 0 || reading} onClick={run}>
                  {usable.length === 0 ? "Make PDF" : `Make a PDF of ${usable.length} ${noun(usable.length)}`}
                </Button>
                <p aria-live="polite" className="text-sm text-ink-2">
                  {reading ? "Reading the images…" : usable.length === 0 ? "None of these files can be used. Remove them and choose images." : "The top picture is the first page."}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="images-result"
          url={result.url}
          file={result.file}
          fromTool={variant === "scan" ? "Scan to PDF" : variant === "heic" ? "HEIC to PDF" : "Images to PDF"}
          nextSlugs={["merge-pdf", "compress-pdf", "rotate-pdf", "page-numbers"]}
          downloadLabel="Download PDF"
          onReset={() => { job.reset(); setItems([]); }}
          summary={<p className="text-lg"><strong data-testid="images-pages">{result.pages} {result.pages === 1 ? "page" : "pages"}</strong> · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
