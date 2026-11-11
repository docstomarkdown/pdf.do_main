"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnchorGrid, type Anchor } from "./AnchorGrid";
import { FileCard } from "./FileCard";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { SelectField, TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { Slider } from "@/components/ui/Slider";
import { numberPdf, type NumberOptions } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { NUMBER_FORMATS, numberLabel, type NumberFormat } from "@/lib/numbering";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

/** Put a number on each page. The preview shows the number where it will be, and follows every change. */
export function PageNumbersTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

/** Where the number sits on the preview, from the page's own size, so it matches the saved page at any zoom. */
function markStyle(position: Anchor, margin: number, size: number, width: number, height: number): CSSProperties {
  const [row, column] = position;
  const style: CSSProperties = { position: "absolute", fontSize: `${(size / width) * 100}cqw`, lineHeight: 1, whiteSpace: "nowrap" };
  if (column === "l") style.left = `${(margin / width) * 100}%`;
  else if (column === "r") style.right = `${(margin / width) * 100}%`;
  else style.left = "50%";
  if (row === "t") style.top = `${(margin / height) * 100}%`;
  else if (row === "b") style.bottom = `${(margin / height) * 100}%`;
  else style.top = "50%";
  const x = column === "c" ? "-50%" : "0";
  const y = row === "m" ? "-50%" : "0";
  if (x !== "0" || y !== "0") style.transform = `translate(${x}, ${y})`;
  return style;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [position, setPosition] = useState<Anchor>("bc");
  const [format, setFormat] = useState<NumberFormat>("n");
  const [start, setStart] = useState("1");
  const [size, setSize] = useState(11);
  const [margin, setMargin] = useState(28);
  const [skipFirst, setSkipFirst] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [shape, setShape] = useState<{ n: number; width: number; height: number } | null>(null);
  const job = useToolJob<{ file: File; pages: number; numbered: number }>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);

  // The page's size in points, for placing the number on the preview.
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(previewPage).then((s) => { if (alive) setShape({ n: previewPage, ...s }); });
    return () => { alive = false; };
  }, [doc, previewPage]);

  const startNumber = Number(start);
  const startProblem = !Number.isInteger(startNumber) || startNumber < 0 || startNumber > 99999 ? "Type a whole number, such as 1." : undefined;
  const numbered = [...pick.selected].filter((n) => !(skipFirst && n === 1)).sort((a, b) => a - b);
  const indexOnPreview = numbered.indexOf(previewPage);
  const last = startNumber + numbered.length - 1;
  const label = indexOnPreview >= 0 && !startProblem ? numberLabel(format, startNumber + indexOnPreview, last) : null;
  const touch = () => job.reset();

  function run() {
    void job.run(async ({ signal }) => {
      const options: NumberOptions = { pages: numbered, position, format, start: startNumber, size, margin };
      const r = await numberPdf(await file.arrayBuffer(), options, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-numbered.pdf`, { type: "application/pdf" }), pages: r.pages, numbered: r.numbered };
    }, "Something went wrong.");
  }

  const result = job.result;
  const noun = (n: number) => (n === 1 ? "page" : "pages");
  const current = shape && shape.n === previewPage ? shape : null;

  return (
    <div className="space-y-6">
      {from && <Alert tone="info">Carried over from {from}.</Alert>}
      <FileCard file={file} pages={pageCount} dim={job.busy} onReplace={onChoose} />

      {readError && <Alert tone="error">{readError}</Alert>}
      {!readError && !doc && <p role="status" className="text-ink-2">Reading pages…</p>}

      {doc && !result && (
        <>
          {/* The page beside its options from 680 px, stacked below that (the approved mocks' page stage). */}
          <div className="stage-split">
            <div className="min-w-0">
              <PagePreview doc={doc} page={previewPage} onPage={setPreviewPage}>
                {label && current && <span className="pn-mark" data-testid="number-mark" style={markStyle(position, margin, size, current.width, current.height)}>{label}</span>}
              </PagePreview>
              <p aria-live="polite" className="hint">
                {label ? `Page ${previewPage} gets “${label}”.` : `Page ${previewPage} is not numbered.`}
              </p>
            </div>

            <div className="stage-opts">
              <AnchorGrid legend="Where on the page" value={position} onChange={(a) => { touch(); setPosition(a); }} disabled={job.busy} />
              <div className="stage-fields">
                <SelectField label="Style" value={format} onChange={(e) => { touch(); setFormat(e.target.value as NumberFormat); }} disabled={job.busy}>
                  {NUMBER_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </SelectField>
                <TextField label="Start at" inputMode="numeric" value={start} onChange={(e) => { touch(); setStart(e.target.value); }} error={startProblem} disabled={job.busy} />
                <Slider label="Size" min={6} max={36} value={size} onChange={(v) => { touch(); setSize(v); }} format={(n) => `${n} pt`} />
                <Slider label="Distance from the edge" min={10} max={72} value={margin} onChange={(v) => { touch(); setMargin(v); }} format={(n) => `${n} pt`} />
                <RangeField
                  label="Pages to number"
                  value={pick.rangeText}
                  onChange={pick.onRange}
                  error={pick.rangeError}
                  disabled={job.busy}
                  placeholder="All pages"
                  hint="Leave empty for every page, or type page numbers and ranges."
                  className="stage-wide"
                />
                <div className="stage-wide">
                  <Checkbox checked={skipFirst} onChange={(e) => { touch(); setSkipFirst(e.target.checked); }} disabled={job.busy}>Skip the first page (a cover)</Checkbox>
                </div>
              </div>
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Numbering pages…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={numbered.length === 0 || !!startProblem || !!pick.rangeError} onClick={run}>
                  {numbered.length === 0 ? "Add page numbers" : `Number ${numbered.length} ${noun(numbered.length)}`}
                </Button>
                <p aria-live="polite" className="text-sm text-ink-2">{numbered.length === 0 ? "No pages are chosen to number." : `${pageCount} ${noun(pageCount)} in this PDF`}</p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="numbers-result"
          url={result.url}
          file={result.file}
          fromTool="Add page numbers"
          nextSlugs={["rotate-pdf", "extract-pdf-pages", "merge-pdf", "compress-pdf"]}
          downloadLabel="Download numbered PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="numbered-count">{result.numbered} {noun(result.numbered)} numbered</strong> · {result.pages} {noun(result.pages)} · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
