"use client";

import { useEffect, useState } from "react";
import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { BreakdownBar, FactList } from "./ReportList";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { TextLink } from "@/components/ui/TextLink";
import { analyzePdf, type SizeReport } from "@/lib/engines";
import { formatBytes } from "@/lib/format";

/** Shows what a PDF's bytes are made of: pictures, fonts, page content and the rest, and its biggest pictures. */
export function SizeAnalyzerTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const [report, setReport] = useState<SizeReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    file.arrayBuffer()
      .then((buffer) => analyzePdf(buffer, controller.signal))
      .then(setReport)
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "This file could not be read as a PDF."); });
    return () => controller.abort();
  }, [file]);

  const share = report ? Math.round((report.parts.images / Math.max(1, report.total)) * 100) : 0;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={report?.pages} onReplace={onChoose} />
      {error && <Alert tone="error">{error}</Alert>}
      {!error && !report && <p role="status" className="text-ink-2">Measuring the file…</p>}

      {report && (
        <>
          <Card className="grid gap-4 p-5" data-testid="size-report">
            <h2 className="text-lg font-bold">What takes the space</h2>
            <BreakdownBar label="What takes the space" parts={[
              { id: "images", label: `Pictures (${report.imageCount})`, bytes: report.parts.images },
              { id: "fonts", label: `Fonts (${report.fonts})`, bytes: report.parts.fonts },
              { id: "content", label: "Page content", bytes: report.parts.content },
              { id: "other", label: "Other embedded data", bytes: report.parts.other },
              { id: "structure", label: "Structure and the rest", bytes: report.parts.structure },
            ]} />
            <p className="hint" style={{ marginTop: 0 }}>
              Sizes are of the stored, compressed data. “Structure and the rest” is what is left of the file once those are taken out, including anything packed in compressed groups.
            </p>
          </Card>

          <FactList label="About this file" facts={[
            { label: "Size", value: formatBytes(report.total) },
            { label: "Pages", value: String(report.pages) },
            { label: "Pictures", value: String(report.imageCount) },
            { label: "Embedded fonts", value: String(report.fonts) },
          ]} />

          {report.images.length > 0 && (
            <FactList label="Biggest pictures" facts={report.images.map((im, i) => ({ label: `Picture ${i + 1}`, value: `${im.width} × ${im.height} · ${im.filter} · ${formatBytes(im.bytes)}` }))} />
          )}

          {share >= 50 ? (
            <Alert tone="info">Pictures make up {share}% of this file. <TextLink href="/compress-pdf">Compress PDF</TextLink> can shrink them.</Alert>
          ) : (
            <p className="text-ink-2">Pictures make up {share}% of this file, so there is less to gain from compressing them.</p>
          )}
        </>
      )}
    </div>
  );
}
