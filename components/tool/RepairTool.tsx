"use client";

import { useState } from "react";
import { FileCard } from "./FileCard";
import { FileDrop } from "./FileDrop";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { repairPdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

let serial = 0;

/** Try to mend a PDF that will not open or opens with errors. A damaged file may not be fully recoverable, and the result says what happened. */
export function RepairTool() {
  const [chosen, setChosen] = useState<{ file: File; id: number } | null>(null);
  if (!chosen) return <FileDrop label="Choose a PDF" onFiles={(f) => setChosen({ file: f[0], id: ++serial })} />;
  return <Workspace key={chosen.id} file={chosen.file} onChoose={(f) => setChosen({ file: f, id: ++serial })} />;
}

function Workspace({ file, onChoose }: { file: File; onChoose: (file: File) => void }) {
  const job = useToolJob<{ file: File; pages: number; mended: boolean }>();
  useLeaveGuard(job.busy);

  function run() {
    void job.run(async ({ signal }) => {
      const r = await repairPdf(await file.arrayBuffer(), signal);
      return { file: new File([r.bytes], `${stem(file.name)}-repaired.pdf`, { type: "application/pdf" }), pages: r.pages, mended: r.mended };
    }, "Something went wrong.");
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      <FileCard file={file} dim={job.busy} onReplace={onChoose} />
      {!result && (
        <ActionBar>
          {job.busy ? (
            <div className="min-w-0 flex-1"><JobProgress label="Repairing…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
          ) : (
            <Button size="lg" onClick={run}>Repair PDF</Button>
          )}
        </ActionBar>
      )}
      {job.error && <Alert tone="error">{job.error}</Alert>}
      {result && (
        <ResultPanel
          testId="repair-result"
          url={result.url}
          file={result.file}
          fromTool="Repair PDF"
          nextSlugs={["compress-pdf", "merge-pdf", "extract-pdf-pages"]}
          downloadLabel="Download repaired PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="repair-pages">{result.pages} {result.pages === 1 ? "page" : "pages"} recovered</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone={result.mended ? "warn" : "info"}>
            {result.mended
              ? "The original could not be read as it was, so the copy was rebuilt from what could be read. Open it and look through it, since damage can cost pages or pictures."
              : "No structural problems were found. The copy is a clean rewrite of the file; damage inside a page or a picture would not show up here."}
          </Alert>
        </ResultPanel>
      )}
    </div>
  );
}
