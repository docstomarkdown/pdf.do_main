"use client";

import { useEffect, useRef, useState } from "react";
import { AnchorGrid, ANCHOR_POINTS, type Anchor } from "./AnchorGrid";
import { FileCard } from "./FileCard";
import { NudgePad } from "./NudgePad";
import { PagePreview } from "./PagePreview";
import { PdfTool } from "./PdfTool";
import { PlacementOverlay } from "./PlacementOverlay";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextArea } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { JobProgress } from "@/components/ui/JobProgress";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { drawOnPdf, type DrawItem } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { unwritable } from "@/lib/numbering";
import { useHistory } from "@/lib/use-history";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Ink = "black" | "blue" | "red" | "grey";
const INK: Record<Ink, { rgb: [number, number, number]; className: string; label: string }> = {
  black: { rgb: [0.07, 0.09, 0.15], className: "wm-black", label: "Black" },
  blue: { rgb: [0.15, 0.45, 0.93], className: "wm-blue", label: "Blue" },
  red: { rgb: [0.86, 0.15, 0.15], className: "wm-red", label: "Red" },
  grey: { rgb: [0.39, 0.45, 0.55], className: "wm-grey", label: "Grey" },
};
type Box = { id: number; page: number; x: number; y: number; text: string; size: number; ink: Ink; bold: boolean };
const clamp = (n: number) => Math.min(100, Math.max(0, n));
const MOST = 200;

/** Type text onto the pages of a PDF: as many boxes as you need, each placed on the preview. */
export function AddTextTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const history = useHistory<Box[]>([]);
  const boxes = history.value;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [shape, setShape] = useState<{ n: number; width: number } | null>(null);
  const nextId = useRef(1);
  const job = useToolJob<{ file: File; drawn: number; touched: number }>();
  useLeaveGuard(job.busy);

  // The page's width in points, so text on the preview is the size it will be on the saved page.
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(previewPage).then((s) => { if (alive) setShape({ n: previewPage, width: s.width }); });
    return () => { alive = false; };
  }, [doc, previewPage]);

  const selected = boxes.find((b) => b.id === selectedId) ?? null;
  const here = boxes.filter((b) => b.page === previewPage);
  const written = boxes.filter((b) => b.text.trim() !== "");
  const problem = (b: Box) => {
    const bad = unwritable(b.text.replace(/[\r\n]/g, ""));
    return bad ? `The font cannot write “${bad}”. Use Latin letters, digits and common punctuation.` : undefined;
  };
  const firstBad = written.find((b) => problem(b));
  const touch = () => job.reset();

  /** A finished change to one box: one step to undo. */
  const change = (id: number, patch: Partial<Box>) => { touch(); history.set(boxes.map((b) => (b.id === id ? { ...b, ...patch } : b))); };
  /** A change still under way (typing, dragging, a slider): shown at once, and one step when it is finished. */
  const live = (id: number, patch: Partial<Box>) => { touch(); history.preview(boxes.map((b) => (b.id === id ? { ...b, ...patch } : b))); };

  function add() {
    touch();
    const id = nextId.current++;
    // Each new box starts a little lower than the last one on this page, so they do not land on top of each other.
    const y = clamp(20 + here.length * 8);
    const like = selected ?? boxes[boxes.length - 1];
    history.set([...boxes, { id, page: previewPage, x: 50, y: y > 90 ? 50 : y, text: "", size: like?.size ?? 12, ink: like?.ink ?? "black", bold: like?.bold ?? false }]);
    setSelectedId(id);
  }

  function remove(id: number) {
    touch();
    history.set(boxes.filter((b) => b.id !== id));
    setSelectedId(null);
  }

  function run() {
    void job.run(async ({ signal }) => {
      const items: DrawItem[] = written.map((b) => ({ kind: "text", page: b.page, x: b.x, y: b.y, text: b.text, size: b.size, color: INK[b.ink].rgb, bold: b.bold }));
      const r = await drawOnPdf(await file.arrayBuffer(), items, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-with-text.pdf`, { type: "application/pdf" }), drawn: r.drawn, touched: r.touched };
    }, "Something went wrong.");
  }

  const result = job.result;
  const boxNoun = (n: number) => (n === 1 ? "text box" : "text boxes");
  const pageNoun = (n: number) => (n === 1 ? "page" : "pages");
  const pagesWritten = new Set(written.map((b) => b.page)).size;
  const current = shape && shape.n === previewPage ? shape : null;
  const nameOf = (b: Box) => `Text box ${boxes.indexOf(b) + 1}${b.text.trim() ? `: ${b.text.trim().split("\n")[0].slice(0, 30)}` : ", empty"}`;

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
              <PagePreview doc={doc} page={previewPage} onPage={(n) => { setPreviewPage(n); setSelectedId(null); }}
                toolbarStart={<>
                  <IconButton icon="undo" label="Undo" disabled={!history.canUndo || job.busy} onClick={() => { touch(); history.undo(); }} />
                  <IconButton icon="redo" label="Redo" disabled={!history.canRedo || job.busy} onClick={() => { touch(); history.redo(); }} />
                </>}>
                {current && here.map((b) => (
                  <PlacementOverlay key={b.id} x={b.x} y={b.y} label={nameOf(b)} selected={b.id === selectedId} onSelect={() => setSelectedId(b.id)}
                    onMove={(x, y) => live(b.id, { x, y })} onCommit={history.commit}>
                    <span data-testid="text-box" className={`pt-text ${INK[b.ink].className} ${b.bold ? "pt-text-bold" : ""} ${b.text.trim() ? "" : "pt-text-empty"}`.replace(/\s+/g, " ").trim()}
                      style={{ fontSize: `${(b.size / current.width) * 100}cqw` }}>{b.text.trim() ? b.text : "Type here"}</span>
                  </PlacementOverlay>
                ))}
              </PagePreview>
              <p aria-live="polite" className="hint" data-testid="text-count">
                {here.length === 0 ? `No text on page ${previewPage} yet.` : `${here.length} ${boxNoun(here.length)} on page ${previewPage}.`}
              </p>
            </div>

            <div className="stage-opts">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" icon="plus" disabled={job.busy || boxes.length >= MOST} onClick={add}>Add a text box</Button>
                {selected && <Button variant="ghost" icon="trash" disabled={job.busy} onClick={() => remove(selected.id)}>Remove this box</Button>}
              </div>

              {!selected && (
                <p className="hint" style={{ marginTop: 0 }}>
                  {boxes.length === 0 ? "Add a text box, type into it, then drag it into place on the page." : "Press a text box on the page to change it, or add another."}
                </p>
              )}

              {selected && (
                <>
                  <TextArea key={selected.id} label="Text" rows={3} value={selected.text} autoFocus maxLength={2000} disabled={job.busy} error={problem(selected)}
                    onChange={(e) => live(selected.id, { text: e.target.value })} onBlur={history.commit} />
                  <Segmented<Ink> legend="Colour" name="text-ink" value={selected.ink} onChange={(ink) => change(selected.id, { ink })} disabled={job.busy}
                    options={(Object.keys(INK) as Ink[]).map((k) => ({ value: k, label: INK[k].label }))} />
                  <div className="stage-fields">
                    <Slider label="Size" min={6} max={72} value={selected.size} onChange={(size) => live(selected.id, { size })} onCommit={history.commit} format={(n) => `${n} pt`} />
                    <div className="self-end pb-1">
                      <Checkbox checked={selected.bold} onChange={(e) => change(selected.id, { bold: e.target.checked })} disabled={job.busy}>Bold</Checkbox>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-6">
                    <AnchorGrid legend="Position" value={(Object.keys(ANCHOR_POINTS) as Anchor[]).find((a) => ANCHOR_POINTS[a].x === selected.x && ANCHOR_POINTS[a].y === selected.y) ?? null}
                      onChange={(a) => change(selected.id, ANCHOR_POINTS[a])} disabled={job.busy} />
                    <NudgePad onNudge={(dx, dy) => change(selected.id, { x: clamp(selected.x + dx), y: clamp(selected.y + dy) })} />
                  </div>
                </>
              )}
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Adding the text…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={written.length === 0 || !!firstBad} onClick={run}>Add text</Button>
                <p aria-live="polite" className="text-sm text-ink-2" data-testid="text-plan">
                  {written.length === 0 ? "Nothing is typed yet." : firstBad ? "A text box has a character the font cannot write." : `${written.length} ${boxNoun(written.length)} on ${pagesWritten} ${pageNoun(pagesWritten)}`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="text-result"
          url={result.url}
          file={result.file}
          fromTool="Add text to PDF"
          nextSlugs={["sign-pdf", "add-image", "compress-pdf"]}
          downloadLabel="Download PDF with the text"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="text-done">{result.drawn} {boxNoun(result.drawn)} added on {result.touched} {pageNoun(result.touched)}</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone="info">The text is now part of each page and cannot be changed with this tool. Keep your original file.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
