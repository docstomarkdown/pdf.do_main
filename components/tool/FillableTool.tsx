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
import { TextField } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { JobProgress } from "@/components/ui/JobProgress";
import { Slider } from "@/components/ui/Slider";
import { addFormFields, readForm, type NewField } from "@/lib/engines";
import { formatBytes, stem } from "@/lib/format";
import { useHistory } from "@/lib/use-history";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useToolJob } from "@/lib/use-tool-job";

type Kind = NewField["kind"];
type Field = { id: number; page: number; kind: Kind; name: string; x: number; y: number; width: number; height: number };
const KIND: Record<Kind, { label: string; stem: string }> = {
  text: { label: "Text field", stem: "Text" },
  multiline: { label: "Large text field", stem: "Notes" },
  check: { label: "Tick box", stem: "Tick" },
};
const clamp = (n: number, low = 0, high = 100) => Math.min(high, Math.max(low, n));
const SMALLEST = 1.5;
const MOST = 200;

/** Add form fields to a PDF: text fields and tick boxes, placed and sized on the preview and given a name each. */
export function FillableTool() {
  return <PdfTool>{({ file, from, onChoose }) => <Workspace file={file} from={from} onChoose={onChoose} />}</PdfTool>;
}

function Workspace({ file, from, onChoose }: { file: File; from?: string; onChoose: (file: File) => void }) {
  const { doc, pageCount, error: readError } = usePdfDocument(file);
  const history = useHistory<Field[]>([]);
  const fields = history.value;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [shape, setShape] = useState<{ n: number; width: number; height: number } | null>(null);
  const [inFile, setInFile] = useState<string[]>([]);
  const nextId = useRef(1);
  const job = useToolJob<{ file: File; added: number; touched: number }>();
  useLeaveGuard(job.busy);

  // The page's shape, so a tick box starts square.
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    void doc.pageSize(previewPage).then((s) => { if (alive) setShape({ n: previewPage, ...s }); });
    return () => { alive = false; };
  }, [doc, previewPage]);

  // The names the file's own fields already use, so a clash is caught while typing. The engine checks again.
  useEffect(() => {
    let alive = true;
    void file.arrayBuffer().then((buffer) => readForm(buffer)).then((r) => { if (alive) setInFile(r.fields.map((f) => f.name)); }).catch(() => { /* an unreadable form is reported when the fields are added */ });
    return () => { alive = false; };
  }, [file]);

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const here = fields.filter((f) => f.page === previewPage);
  const touch = () => job.reset();
  const problem = (f: Field): string | undefined => {
    const name = f.name.trim();
    if (name === "") return "Give the field a name.";
    if (name.includes(".")) return "A field name cannot have a full stop in it.";
    if (inFile.includes(name)) return "This PDF already has a field with that name.";
    if (fields.some((o) => o.id !== f.id && o.name.trim() === name)) return "Another field has that name. Every field needs its own.";
    return undefined;
  };
  const firstBad = fields.find((f) => problem(f));

  const change = (id: number, patch: Partial<Field>) => { touch(); history.set(fields.map((f) => (f.id === id ? { ...f, ...patch } : f))); };
  const live = (id: number, patch: Partial<Field>) => { touch(); history.preview(fields.map((f) => (f.id === id ? { ...f, ...patch } : f))); };

  function add(kind: Kind) {
    touch();
    const id = nextId.current++;
    const taken = new Set([...inFile, ...fields.map((f) => f.name.trim())]);
    let n = fields.filter((f) => f.kind === kind).length + 1;
    while (taken.has(`${KIND[kind].stem} ${n}`)) n++;
    // A tick box starts square on the page: its height in percent follows the page's own proportions.
    const ratio = shape ? shape.width / shape.height : 0.7;
    const size = kind === "check" ? { width: 3, height: 3 * ratio } : kind === "multiline" ? { width: 44, height: 10 } : { width: 34, height: 3 };
    const y = clamp(20 + here.length * 7, 6, 94);
    history.set([...fields, { id, page: previewPage, kind, name: `${KIND[kind].stem} ${n}`, x: 50, y, ...size }]);
    setSelectedId(id);
  }

  function remove(id: number) {
    touch();
    history.set(fields.filter((f) => f.id !== id));
    setSelectedId(null);
  }

  function run() {
    void job.run(async ({ signal }) => {
      const list: NewField[] = fields.map((f) => ({ page: f.page, kind: f.kind, name: f.name.trim(), x: f.x, y: f.y, width: f.width, height: f.height }));
      const r = await addFormFields(await file.arrayBuffer(), list, signal);
      return { file: new File([r.bytes], `${stem(file.name)}-fillable.pdf`, { type: "application/pdf" }), added: r.added, touched: r.touched };
    }, "Something went wrong.");
  }

  const result = job.result;
  const fieldNoun = (n: number) => (n === 1 ? "field" : "fields");
  const pageNoun = (n: number) => (n === 1 ? "page" : "pages");
  const pagesUsed = new Set(fields.map((f) => f.page)).size;
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
              <PagePreview doc={doc} page={previewPage} onPage={(n) => { setPreviewPage(n); setSelectedId(null); }}
                toolbarStart={<>
                  <IconButton icon="undo" label="Undo" disabled={!history.canUndo || job.busy} onClick={() => { touch(); history.undo(); }} />
                  <IconButton icon="redo" label="Redo" disabled={!history.canRedo || job.busy} onClick={() => { touch(); history.redo(); }} />
                </>}>
                {current && here.map((f) => (
                  <PlacementOverlay key={f.id} x={f.x} y={f.y} size={f.width} height={f.height} minSize={SMALLEST} maxSize={100} className="mark-box"
                    label={`${KIND[f.kind].label}: ${f.name.trim() || "no name"}`} selected={f.id === selectedId} onSelect={() => setSelectedId(f.id)}
                    onMove={(x, y) => live(f.id, { x, y })} onResizeBox={(width, height) => live(f.id, { width, height })} onCommit={history.commit}>
                    <span className="ff-box" data-testid="form-field">{f.kind === "check" ? "" : f.name}</span>
                  </PlacementOverlay>
                ))}
              </PagePreview>
              <p aria-live="polite" className="hint" data-testid="field-count">
                {here.length === 0 ? `No fields on page ${previewPage} yet.` : `${here.length} ${fieldNoun(here.length)} on page ${previewPage}.`}
              </p>
            </div>

            <div className="stage-opts">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" icon="plus" disabled={job.busy || fields.length >= MOST} onClick={() => add("text")}>Text field</Button>
                <Button variant="secondary" icon="plus" disabled={job.busy || fields.length >= MOST} onClick={() => add("multiline")}>Large text field</Button>
                <Button variant="secondary" icon="plus" disabled={job.busy || fields.length >= MOST} onClick={() => add("check")}>Tick box</Button>
              </div>

              {!selected && (
                <p className="hint" style={{ marginTop: 0 }}>
                  {fields.length === 0 ? "Add a field, then drag it over a blank on the page and size it by its corner." : "Press a field on the page to change it, or add another."}
                </p>
              )}

              {selected && (
                <>
                  <TextField key={selected.id} label="Field name" value={selected.name} maxLength={60} disabled={job.busy} error={problem(selected)} autoComplete="off" spellCheck={false}
                    hint={`${KIND[selected.kind].label}. The name is how a program tells the fields apart.`}
                    onChange={(e) => live(selected.id, { name: e.target.value })} onBlur={history.commit} />
                  <div className="stage-fields">
                    <Slider label="Width" min={SMALLEST} max={100} step={0.5} value={Math.round(selected.width * 2) / 2} onChange={(width) => live(selected.id, { width })} onCommit={history.commit} format={(n) => `${n}%`} />
                    <Slider label="Height" min={SMALLEST} max={100} step={0.5} value={Math.round(selected.height * 2) / 2} onChange={(height) => live(selected.id, { height })} onCommit={history.commit} format={(n) => `${n}%`} />
                  </div>
                  <div className="flex flex-wrap items-start gap-6">
                    <AnchorGrid legend="Position" value={(Object.keys(ANCHOR_POINTS) as Anchor[]).find((a) => ANCHOR_POINTS[a].x === selected.x && ANCHOR_POINTS[a].y === selected.y) ?? null}
                      onChange={(a) => change(selected.id, ANCHOR_POINTS[a])} disabled={job.busy} />
                    <NudgePad onNudge={(dx, dy) => change(selected.id, { x: clamp(selected.x + dx), y: clamp(selected.y + dy) })} />
                  </div>
                  <div><Button variant="ghost" icon="trash" disabled={job.busy} onClick={() => remove(selected.id)}>Remove this field</Button></div>
                </>
              )}
            </div>
          </div>

          <ActionBar>
            {job.busy ? (
              <div className="min-w-0 flex-1"><JobProgress label="Adding the fields…" sublabel="Your file stays on this device." onCancel={job.cancel} /></div>
            ) : (
              <>
                <Button size="lg" disabled={fields.length === 0 || !!firstBad} onClick={run}>Add fields</Button>
                <p aria-live="polite" className="text-sm text-ink-2" data-testid="field-plan">
                  {fields.length === 0 ? "No fields yet." : firstBad ? `Fix the name of “${firstBad.name.trim() || "the field with no name"}” first.` : `${fields.length} ${fieldNoun(fields.length)} on ${pagesUsed} ${pageNoun(pagesUsed)}`}
                </p>
              </>
            )}
          </ActionBar>
        </>
      )}

      {job.error && <Alert tone="error">{job.error}</Alert>}

      {result && (
        <ResultPanel
          testId="fillable-result"
          url={result.url}
          file={result.file}
          fromTool="Make PDF fillable"
          nextSlugs={["fill-pdf-form", "sign-pdf", "compress-pdf"]}
          downloadLabel="Download fillable PDF"
          onReset={() => job.reset()}
          summary={<p className="text-lg"><strong data-testid="fields-done">{result.added} {fieldNoun(result.added)} added on {result.touched} {pageNoun(result.touched)}</strong> · {formatBytes(result.file.size)}</p>}
        >
          <Alert tone="info">Try it: press Fill PDF form below and type into the new fields.</Alert>
        </ResultPanel>
      )}
    </div>
  );
}
