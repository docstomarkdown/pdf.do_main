"use client";

import { useEffect, useState } from "react";
import { AnchorGrid, type Anchor } from "./AnchorGrid";
import { FileCard } from "./FileCard";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { RangeField } from "./RangeField";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { JobProgress } from "@/components/ui/JobProgress";
import { Slider } from "@/components/ui/Slider";
import { numberPdf, type NumberOptions } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { markStyle } from "@/lib/number-mark";
import { BATES_DIGITS, batesLabel, unwritable } from "@/lib/numbering";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePageSelection } from "@/lib/use-page-selection";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

const LARGEST_START = 999_999_999;

/** Stamp each page with an identifier: a prefix, a number padded with zeros, a suffix. The preview shows it in place. */
export function BatesTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

type Done = { file: File; pages: number; numbered: number; first: string; last: string; next: number };

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [digits, setDigits] = useState(6);
  const [start, setStart] = useState("1");
  const [position, setPosition] = useState<Anchor>("br");
  const [size, setSize] = useState(10);
  const [margin, setMargin] = useState(28);
  const [previewPage, setPreviewPage] = useState(1);
  const [shape, setShape] = useState<{ n: number; width: number; height: number } | null>(null);
  const job = useToolJob<Done>();
  useLeaveGuard(job.busy);
  const pick = usePageSelection(pageCount, true, job.reset);

  // The page's size in points, for placing the identifier on the preview.
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(previewPage).then((s) => { if (alive) setShape({ n: previewPage, ...s }); });
    return () => { alive = false; };
  }, [doc, previewPage]);

  const startNumber = Number(start);
  const startProblem = start.trim() === "" || !Number.isInteger(startNumber) || startNumber < 0 || startNumber > LARGEST_START ? "Type a whole number, such as 1." : undefined;
  const cannotWrite = (text: string) => {
    const bad = unwritable(text);
    return bad ? `The font cannot write “${bad}”. Use Latin letters, digits and common punctuation.` : undefined;
  };
  const prefixProblem = cannotWrite(prefix);
  const suffixProblem = cannotWrite(suffix);
  const numbered = [...pick.selected].sort((a, b) => a - b);
  const blocked = !!startProblem || !!prefixProblem || !!suffixProblem;
  const label = (index: number) => batesLabel(prefix, startNumber + index, digits, suffix);
  const indexOnPreview = numbered.indexOf(previewPage);
  const onPreview = indexOnPreview >= 0 && !blocked ? label(indexOnPreview) : null;
  const touch = () => job.reset();

  function run() {
    void job.run(async ({ signal }) => {
      const options: NumberOptions = { pages: numbered, position, format: "n", start: startNumber, size, margin, bates: { prefix, suffix, digits } };
      const r = await numberPdf(await file.arrayBuffer(), options, signal);
      return {
        file: new File([r.bytes], `${stem(file.name)}-bates.pdf`, { type: "application/pdf" }),
        pages: r.pages, numbered: r.numbered, first: r.firstLabel, last: r.lastLabel, next: startNumber + r.numbered,
      };
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
                {onPreview && current && <span className="pn-mark" data-testid="number-mark" style={markStyle(position, margin, size, current.width, current.height)}>{onPreview}</span>}
              </PagePreview>
              <p aria-live="polite" className="hint">
                {onPreview ? `Page ${previewPage} gets “${onPreview}”.` : blocked ? "Fix the marked field to see the identifier." : `Page ${previewPage} is not numbered.`}
              </p>
            </div>

            <div className="stage-opts">
              <div className="stage-fields">
                <TextField label="Prefix" value={prefix} onChange={(e) => { touch(); setPrefix(e.target.value); }} error={prefixProblem} disabled={job.busy}
                  placeholder="ABC" maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
                <TextField label="Suffix" value={suffix} onChange={(e) => { touch(); setSuffix(e.target.value); }} error={suffixProblem} disabled={job.busy}
                  placeholder="None" maxLength={20} autoComplete="off" spellCheck={false} />
                <TextField label="Start at" inputMode="numeric" value={start} onChange={(e) => { touch(); setStart(e.target.value); }} error={startProblem} disabled={job.busy} />
                <SelectField label="Digits" value={digits} onChange={(e) => { touch(); setDigits(Number(e.target.value)); }} disabled={job.busy}>
                  {BATES_DIGITS.map((n) => <option key={n} value={n}>{n} ({"1".padStart(n, "0")})</option>)}
                </SelectField>
              </div>
              <AnchorGrid legend="Where on the page" value={position} onChange={(a) => { touch(); setPosition(a); }} disabled={job.busy} />
              <div className="stage-fields">
                <Slider label="Size" min={6} max={24} value={size} onChange={(v) => { touch(); setSize(v); }} format={(n) => `${n} pt`} />
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
              </div>
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Numbering pages…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={numbered.length === 0 || blocked || !!pick.rangeError} onClick={run}>
                  {numbered.length === 0 ? "Number pages" : `Number ${numbered.length} ${noun(numbered.length)}`}
                </Button>
                <p aria-live="polite" className="text-sm text-ink-2" data-testid="bates-plan">
                  {numbered.length === 0 ? "No pages are chosen to number." : blocked ? "Fix the field marked above first." : numbered.length === 1 ? label(0) : `${label(0)} to ${label(numbered.length - 1)}`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="bates-result"
          url={result.url}
          file={result.file}
          fromTool="Bates numbering"
          nextSlugs={["merge-pdf", "compress-pdf", "encrypt-pdf"]}
          downloadLabel="Download numbered PDF"
          onReset={() => job.reset()}
          summary={
            <p className="text-lg">
              <strong data-testid="bates-count">{result.numbered} {noun(result.numbered)} numbered</strong> ·{" "}
              <span data-testid="bates-range">{result.first === result.last ? result.first : `${result.first} to ${result.last}`}</span> · {formatBytes(result.file.size)}
            </p>
          }
        >
          <Alert tone="info">To carry the sequence on in another file, start that file at <strong data-testid="bates-next">{result.next}</strong>.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
