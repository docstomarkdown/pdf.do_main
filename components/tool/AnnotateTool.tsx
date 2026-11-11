"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
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
import { IconButton } from "@/components/ui/IconButton";
import { JobProgress } from "@/components/ui/JobProgress";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { drawOnPdf, type DrawItem } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useHistory } from "@/lib/use-history";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Rgb = [number, number, number];
type Ink = "red" | "blue" | "black";
type Tint = "yellow" | "green" | "pink" | "blue";
const INK: Record<Ink, { rgb: Rgb; className: string; label: string }> = {
  red: { rgb: [0.86, 0.15, 0.15], className: "wm-red", label: "Red" },
  blue: { rgb: [0.15, 0.45, 0.93], className: "wm-blue", label: "Blue" },
  black: { rgb: [0.07, 0.09, 0.15], className: "wm-black", label: "Black" },
};
const TINT: Record<Tint, { rgb: Rgb; className: string; label: string }> = {
  yellow: { rgb: [0.99, 0.88, 0.28], className: "an-hl-yellow", label: "Yellow" },
  green: { rgb: [0.53, 0.94, 0.67], className: "an-hl-green", label: "Green" },
  pink: { rgb: [0.98, 0.66, 0.83], className: "an-hl-pink", label: "Pink" },
  blue: { rgb: [0.58, 0.77, 0.99], className: "an-hl-blue", label: "Blue" },
};
type Point = [number, number];
type Shared = { id: number; page: number };
type Highlight = Shared & { kind: "highlight"; x: number; y: number; width: number; height: number; tint: Tint };
type Box = Shared & { kind: "box"; x: number; y: number; width: number; height: number; ink: Ink };
type Pen = Shared & { kind: "pen"; points: Point[]; ink: Ink; thick: boolean };
type Mark = Highlight | Box | Pen;
const WORD: Record<Mark["kind"], string> = { highlight: "Highlight", box: "Box", pen: "Pen line" };
const clamp = (n: number, low = 0, high = 100) => Math.min(high, Math.max(low, n));
const HIGHLIGHT_STRENGTH = 0.6;
const BOX_LINE = 1.5; // points
const penLine = (thick: boolean) => (thick ? 4 : 2); // points
const MOST = 300;
const MOST_POINTS = 2000;

/** Mark up a PDF: see-through highlights, outline boxes and freehand pen lines, drawn onto the pages. */
export function AnnotateTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const history = useHistory<Mark[]>([]);
  const marks = history.value;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [shape, setShape] = useState<{ n: number; width: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [penInk, setPenInk] = useState<Ink>("red");
  const [penThick, setPenThick] = useState(false);
  const [stroke, setStroke] = useState<Point[] | null>(null);
  const nextId = useRef(1);
  const job = useToolJob<{ file: File; drawn: number; touched: number }>();
  useLeaveGuard(job.busy);

  // The page's width in points, so a pen line on the preview is as thick as it will be on the saved page.
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(previewPage).then((s) => { if (alive) setShape({ n: previewPage, width: s.width }); });
    return () => { alive = false; };
  }, [doc, previewPage]);

  const selected = marks.find((m) => m.id === selectedId) ?? null;
  const here = marks.filter((m) => m.page === previewPage);
  const full = marks.length >= MOST;
  const touch = () => job.reset();
  const nameOf = (m: Mark) => `${WORD[m.kind]} ${marks.filter((o) => o.kind === m.kind).indexOf(m) + 1}`;

  const change = (id: number, patch: Partial<Highlight> | Partial<Box> | Partial<Pen>) => { touch(); history.set(marks.map((m) => (m.id === id ? ({ ...m, ...patch } as Mark) : m))); };
  const live = (id: number, patch: Partial<Highlight> | Partial<Box>) => { touch(); history.preview(marks.map((m) => (m.id === id ? ({ ...m, ...patch } as Mark) : m))); };

  function addShape(kind: "highlight" | "box") {
    touch();
    setDrawing(false);
    const id = nextId.current++;
    const y = clamp(20 + here.filter((m) => m.kind !== "pen").length * 7, 6, 94);
    const last = [...marks].reverse().find((m) => m.kind === kind);
    const mark: Mark = kind === "highlight"
      ? { id, page: previewPage, kind, x: 50, y, width: 30, height: 2.4, tint: last && last.kind === "highlight" ? last.tint : "yellow" }
      : { id, page: previewPage, kind, x: 50, y, width: 30, height: 8, ink: last && last.kind === "box" ? last.ink : "red" };
    history.set([...marks, mark]);
    setSelectedId(id);
  }

  function remove(id: number) {
    touch();
    history.set(marks.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  // The pen: a stroke is the points the pointer passes through, as percentages of the page.
  const pointOf = (e: PointerEvent<HTMLDivElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(clamp(((e.clientX - r.left) / r.width) * 100) * 10) / 10, Math.round(clamp(((e.clientY - r.top) / r.height) * 100) * 10) / 10];
  };
  function penDown(e: PointerEvent<HTMLDivElement>) {
    if (full || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setStroke([pointOf(e)]);
  }
  function penMove(e: PointerEvent<HTMLDivElement>) {
    if (!stroke || stroke.length >= MOST_POINTS) return;
    const p = pointOf(e);
    const last = stroke[stroke.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.3) setStroke([...stroke, p]);
  }
  function penUp() {
    if (!stroke) return;
    touch();
    const id = nextId.current++;
    history.set([...marks, { id, page: previewPage, kind: "pen", points: stroke, ink: penInk, thick: penThick }]);
    setStroke(null);
  }

  function run() {
    void job.run(async ({ signal }) => {
      const items: DrawItem[] = marks.map((m) => {
        if (m.kind === "highlight") return { kind: "rect", page: m.page, x: m.x, y: m.y, width: m.width, height: m.height, color: TINT[m.tint].rgb, opacity: HIGHLIGHT_STRENGTH, fill: true };
        if (m.kind === "box") return { kind: "rect", page: m.page, x: m.x, y: m.y, width: m.width, height: m.height, color: INK[m.ink].rgb, opacity: 1, fill: false, line: BOX_LINE };
        return { kind: "path", page: m.page, points: m.points, color: INK[m.ink].rgb, opacity: 1, line: penLine(m.thick) };
      });
      const r = await drawOnPdf(await file.arrayBuffer(), items, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-marked.pdf`, { type: "application/pdf" }), drawn: r.drawn, touched: r.touched };
    }, "Something went wrong.");
  }

  const result = job.result;
  const markNoun = (n: number) => (n === 1 ? "mark" : "marks");
  const pageNoun = (n: number) => (n === 1 ? "page" : "pages");
  const pagesMarked = new Set(marks.map((m) => m.page)).size;
  const current = shape && shape.n === previewPage ? shape : null;
  const strokeWidth = (points: number) => (current ? `${(points / current.width) * 100}cqw` : undefined);
  const line = (points: Point[]) => (points.length === 1 ? [points[0], points[0]] : points).map((p) => p.join(",")).join(" ");
  const anchorOf = (m: Highlight | Box) => (Object.keys(ANCHOR_POINTS) as Anchor[]).find((a) => ANCHOR_POINTS[a].x === m.x && ANCHOR_POINTS[a].y === m.y) ?? null;

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
              <PagePreview doc={doc} page={previewPage} onPage={(n) => { setPreviewPage(n); setSelectedId(null); setStroke(null); }}
                toolbarStart={<>
                  <IconButton icon="undo" label="Undo" disabled={!history.canUndo || job.busy} onClick={() => { touch(); history.undo(); }} />
                  <IconButton icon="redo" label="Redo" disabled={!history.canRedo || job.busy} onClick={() => { touch(); history.redo(); }} />
                </>}>
                {current && (
                  <svg className="an-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {here.map((m) => m.kind === "pen" && (
                      <polyline key={m.id} data-testid="pen-line" className={`an-pen ${INK[m.ink].className}`} points={line(m.points)} style={{ strokeWidth: strokeWidth(penLine(m.thick) * (m.id === selectedId ? 1.8 : 1)) }} />
                    ))}
                    {stroke && <polyline className={`an-pen ${INK[penInk].className}`} points={line(stroke)} style={{ strokeWidth: strokeWidth(penLine(penThick)) }} />}
                  </svg>
                )}
                {current && here.map((m) => m.kind !== "pen" && (
                  <PlacementOverlay key={m.id} x={m.x} y={m.y} size={m.width} height={m.height} minSize={1} maxSize={100} className="mark-box"
                    label={nameOf(m)} selected={m.id === selectedId} onSelect={() => setSelectedId(m.id)}
                    onMove={(x, y) => live(m.id, { x, y })} onResizeBox={(width, height) => live(m.id, { width, height })} onCommit={history.commit}>
                    {m.kind === "highlight"
                      ? <span data-testid="highlight" className={`an-hl ${TINT[m.tint].className}`} />
                      : <span data-testid="outline-box" className={`an-box ${INK[m.ink].className}`} />}
                  </PlacementOverlay>
                ))}
                {drawing && (
                  <div className="an-draw" data-testid="pen-layer" role="img" aria-label="Drawing area: draw with a mouse, a finger or a stylus"
                    onPointerDown={penDown} onPointerMove={penMove} onPointerUp={penUp} onPointerCancel={penUp} />
                )}
              </PagePreview>
              <p aria-live="polite" className="hint" data-testid="mark-count">
                {here.length === 0 ? `No marks on page ${previewPage} yet.` : `${here.length} ${markNoun(here.length)} on page ${previewPage}.`}
              </p>
            </div>

            <div className="stage-opts">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" icon="highlighter" disabled={job.busy || full} onClick={() => addShape("highlight")}>Highlight</Button>
                <Button variant="secondary" icon="plus" disabled={job.busy || full} onClick={() => addShape("box")}>Box</Button>
                <Button variant="secondary" icon="pen" aria-pressed={drawing} disabled={job.busy} onClick={() => { setDrawing(!drawing); setSelectedId(null); setStroke(null); }}>
                  {drawing ? "Stop drawing" : "Draw with the pen"}
                </Button>
              </div>

              {drawing && (
                <>
                  <p className="hint" style={{ marginTop: 0 }}>Draw on the page with a mouse, a finger or a stylus. Each stroke is one mark. Press Stop drawing to move or size the other marks.</p>
                  <Segmented<Ink> legend="Pen colour" name="pen-ink" value={penInk} onChange={setPenInk} disabled={job.busy}
                    options={(Object.keys(INK) as Ink[]).map((k) => ({ value: k, label: INK[k].label }))} />
                  <Checkbox checked={penThick} onChange={(e) => setPenThick(e.target.checked)} disabled={job.busy}>Thick line</Checkbox>
                </>
              )}

              {!drawing && !selected && (
                <p className="hint" style={{ marginTop: 0 }}>
                  {marks.length === 0 ? "Add a highlight or a box and drag it into place, or draw with the pen." : "Press a mark on the page or in the list to change it, or add another."}
                </p>
              )}

              {!drawing && selected && selected.kind === "highlight" && (
                <Segmented<Tint> legend="Colour" name="highlight-tint" value={selected.tint} onChange={(tint) => change(selected.id, { tint })} disabled={job.busy}
                  options={(Object.keys(TINT) as Tint[]).map((k) => ({ value: k, label: TINT[k].label }))} />
              )}
              {!drawing && selected && selected.kind !== "highlight" && (
                <Segmented<Ink> legend="Colour" name="mark-ink" value={selected.ink} onChange={(ink) => change(selected.id, { ink })} disabled={job.busy}
                  options={(Object.keys(INK) as Ink[]).map((k) => ({ value: k, label: INK[k].label }))} />
              )}
              {!drawing && selected && selected.kind === "pen" && (
                <Checkbox checked={selected.thick} onChange={(e) => change(selected.id, { thick: e.target.checked })} disabled={job.busy}>Thick line</Checkbox>
              )}
              {!drawing && selected && selected.kind !== "pen" && (
                <>
                  <div className="stage-fields">
                    <Slider label="Width" min={1} max={100} step={0.5} value={Math.round(selected.width * 2) / 2} onChange={(width) => live(selected.id, { width })} onCommit={history.commit} format={(n) => `${n}%`} />
                    <Slider label="Height" min={1} max={100} step={0.2} value={Math.round(selected.height * 5) / 5} onChange={(height) => live(selected.id, { height })} onCommit={history.commit} format={(n) => `${n}%`} />
                  </div>
                  <div className="flex flex-wrap items-start gap-6">
                    <AnchorGrid legend="Position" value={anchorOf(selected)} onChange={(a) => change(selected.id, ANCHOR_POINTS[a])} disabled={job.busy} />
                    <NudgePad onNudge={(dx, dy) => change(selected.id, { x: clamp(selected.x + dx), y: clamp(selected.y + dy) })} />
                  </div>
                </>
              )}

              {here.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Marks on this page</p>
                  <ul className="marklist">
                    {here.map((m) => (
                      <li key={m.id} data-selected={m.id === selectedId}>
                        <button type="button" className="marklist-name" aria-pressed={m.id === selectedId} disabled={job.busy} onClick={() => { setDrawing(false); setSelectedId(m.id); }}>{nameOf(m)}</button>
                        <IconButton icon="trash" tone="danger" label={`Remove ${nameOf(m)}`} disabled={job.busy} onClick={() => remove(m.id)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Saving the marks…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={marks.length === 0} onClick={run}>Save marks</Button>
                <p aria-live="polite" className="text-sm text-ink-2" data-testid="mark-plan">
                  {marks.length === 0 ? "No marks yet." : `${marks.length} ${markNoun(marks.length)} on ${pagesMarked} ${pageNoun(pagesMarked)}`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="annotate-result"
          url={result.url}
          file={result.file}
          fromTool="Annotate PDF"
          nextSlugs={["add-text", "sign-pdf", "compress-pdf"]}
          downloadLabel="Download marked PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="marks-done">{result.drawn} {markNoun(result.drawn)} added on {result.touched} {pageNoun(result.touched)}</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone="info">The marks are drawn onto the pages. They are not comments, and they cannot be taken off with this tool. Keep your original file.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
