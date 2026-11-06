"use client";

import { useState } from "react";
import { FileDrop } from "./FileDrop";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { Slider } from "@/components/ui/Slider";
import { textToPdf } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

type Font = "helvetica" | "times" | "courier";
const MARGINS = { small: 36, medium: 54, large: 72 } as const;

/** Type or paste text, or open a .txt file, and get a PDF. The fonts are the standard PDF ones, so Latin letters only. */
export function TextToPdfTool() {
  const [text, setText] = useState("");
  const [name, setName] = useState("text");
  const [size, setSize] = useState<"a4" | "letter">("a4");
  const [margin, setMargin] = useState<keyof typeof MARGINS>("medium");
  const [font, setFont] = useState<Font>("helvetica");
  const [fontSize, setFontSize] = useState(11);
  const [notice, setNotice] = useState<string | null>(null);
  const job = useToolJob<{ file: File; pages: number; replaced: number }>();
  useLeaveGuard(job.busy);
  const touch = () => job.reset();

  function open(files: File[]) {
    const file = files[0];
    touch();
    setNotice(null);
    if (file.size > 5 * 1024 * 1024) { setNotice("That file is over 5 MB, which is too large to lay out here."); return; }
    void file.text().then((t) => { setText(t); setName(stem(file.name.replace(/\.[^.]+$/, "") + ".pdf")); });
  }

  function run() {
    void job.run(async ({ signal, setProgress }) => {
      const r = await textToPdf(text, { size, margin: MARGINS[margin] }, font, fontSize, setProgress, signal);
      return { file: new File([r.bytes], `${name}.pdf`, { type: "application/pdf" }), pages: r.pages, replaced: r.replaced };
    }, "Something went wrong.");
  }

  const result = job.result;

  return (
    <div className="space-y-6">
      {!result && (
        <>
          <FileDrop label="Open a text file" accept="any" compact onFiles={open} disabled={job.busy} />
          {notice && <Alert tone="error">{notice}</Alert>}
          <TextArea label="Text" rows={10} value={text} onChange={(e) => { touch(); setText(e.target.value); }} disabled={job.busy} hint="Type, paste, or open a .txt file above." />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Page size" value={size} onChange={(e) => { touch(); setSize(e.target.value as "a4" | "letter"); }} disabled={job.busy}>
              <option value="a4">A4</option><option value="letter">US Letter</option>
            </SelectField>
            <SelectField label="Margin" value={margin} onChange={(e) => { touch(); setMargin(e.target.value as keyof typeof MARGINS); }} disabled={job.busy}>
              <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
            </SelectField>
            <SelectField label="Font" value={font} onChange={(e) => { touch(); setFont(e.target.value as Font); }} disabled={job.busy}>
              <option value="helvetica">Sans (Helvetica)</option><option value="times">Serif (Times)</option><option value="courier">Typewriter (Courier)</option>
            </SelectField>
          </div>
          <Slider label="Text size" min={8} max={20} value={fontSize} onChange={(v) => { touch(); setFontSize(v); }} format={(n) => `${n} pt`} />

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Laying out the pages…" value={job.progress} sublabel="Your text stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={text.trim() === ""} onClick={run}>Make PDF</Button>
                <p aria-live="polite" className="text-sm text-ink-2">{text.trim() === "" ? "Type or paste some text." : `${text.length.toLocaleString("en")} characters`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="text-pdf-result"
          url={result.url}
          file={result.file}
          fromTool="Text to PDF"
          nextSlugs={["page-numbers", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="text-pdf-pages">{result.pages} {result.pages === 1 ? "page" : "pages"}</strong> · {formatBytes(result.file.size)}</p>}
        >
          {result.replaced > 0 && (
            <Alert tone="warn">
              {result.replaced.toLocaleString("en")} {result.replaced === 1 ? "character is" : "characters are"} not in the standard PDF fonts, which cover Latin letters only. {result.replaced === 1 ? "It is" : "They are"} shown as “?”.
            </Alert>
          )}
        </ResultPanel>
      )}
    </div>
  );
}
