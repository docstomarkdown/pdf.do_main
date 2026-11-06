"use client";

import { useEffect, useState } from "react";
import { FileCard } from "./FileCard";
import { PdfTool } from "./PdfTool";
import { ReportList, type Finding } from "./ReportList";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { TextLink } from "@/components/ui/TextLink";
import { scanPrivacy, type PrivacyFinding } from "@/lib/engines";

/** Looks through a PDF for what it carries beyond its pages: names, locations, scripts, attachments, old versions. Reads only. */
export function PrivacyScannerTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const [findings, setFindings] = useState<PrivacyFinding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    file.arrayBuffer()
      .then((buffer) => scanPrivacy(buffer, controller.signal))
      .then((r) => setFindings(r.findings))
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "This file could not be read as a PDF."); });
    return () => controller.abort();
  }, [file]);

  const rows: Finding[] = (findings ?? []).map((f) => ({ id: f.id, tone: f.tone, label: f.tone === "ok" ? "Clear" : "Found", title: f.title, detail: f.detail }));
  const found = rows.filter((r) => r.tone !== "ok").length;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} onReplace={onChoose} />
      {error && <Alert tone="error">{error}</Alert>}
      {!error && !findings && <p role="status" className="text-ink-2">Looking through the file…</p>}

      {findings && (
        <>
          <p className="text-lg" data-testid="privacy-summary"><strong>{found === 0 ? "Nothing found" : `${found} ${found === 1 ? "thing" : "things"} found`}</strong> in {findings.length} checks.</p>
          <Card className="p-5" data-testid="privacy-report"><ReportList label="Privacy scan" findings={rows} /></Card>
          <Alert tone="info">
            These are common places only. A clear result is not a guarantee: text and pictures on the pages themselves are not examined. You can change the document details with <TextLink href="/edit-pdf-metadata">Edit PDF metadata</TextLink>; nothing here removes what it finds.
          </Alert>
        </>
      )}
    </div>
  );
}
