"use client";

// The component gallery: every block in every state, in light and dark side by side, at a chosen width.
// Development only: it is not part of the production export (see next.config.ts). Colours come from
// app/globals.css like everywhere else; nothing here sets one.
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnchorGrid, ANCHOR_POINTS, type Anchor } from "@/components/tool/AnchorGrid";
import { FileCard } from "@/components/tool/FileCard";
import { DownloadAll } from "@/components/tool/DownloadAll";
import { FileList, type FileItem } from "@/components/tool/FileList";
import { ImageGallery, type GalleryImage } from "@/components/tool/ImageGallery";
import { MultiResult, type OutputFile } from "@/components/tool/MultiResult";
import { NudgePad } from "@/components/tool/NudgePad";
import { PageGrid, type GridPage } from "@/components/tool/PageGrid";
import { PagePreview } from "@/components/tool/PagePreview";
import { PlacementOverlay } from "@/components/tool/PlacementOverlay";
import { RangeField } from "@/components/tool/RangeField";
import { BreakdownBar, FactList, ReportList } from "@/components/tool/ReportList";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { SelectionToolbar } from "@/components/tool/SelectionToolbar";
import { TextOutput } from "@/components/tool/TextOutput";
import { Callout } from "@/components/site/Callout";
import { DocRow, DocSearch, Hit } from "@/components/site/DocRow";
import { FactRow, Feature, SectionHead } from "@/components/site/Section";
import { ToolChips } from "@/components/site/ToolGroups";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { TickList } from "@/components/ui/TickList";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Disclosure } from "@/components/ui/Disclosure";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { ICON_NAMES, Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { JobProgress } from "@/components/ui/JobProgress";
import { notify } from "@/components/ui/Notifier";
import { OptionCards } from "@/components/ui/OptionCards";
import { PasswordField } from "@/components/ui/PasswordField";
import { Progress } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { SizeComparison } from "@/components/ui/SizeComparison";
import { Skeleton } from "@/components/ui/Skeleton";
import { Slider } from "@/components/ui/Slider";
import { Spinner } from "@/components/ui/Spinner";
import { TextLink } from "@/components/ui/TextLink";
import { usePdfDocument } from "@/lib/use-pdf-document";
import { useHistory } from "@/lib/use-history";
import { useThumbs } from "@/lib/use-thumbs";

type Scheme = "light" | "dark";

/** One specimen: the same demo drawn in both themes, each with its own state. */
function Specimen({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const heading = `s-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="mt-12" aria-labelledby={heading}>
      <h2 id={heading} className="text-2xl font-bold tracking-tight">{title}</h2>
      {note && <p className="mt-1 max-w-3xl text-ink-3">{note}</p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(["light", "dark"] as Scheme[]).map((scheme) => (
          <div key={scheme} data-scheme={scheme} className={`scheme-${scheme} min-w-0 rounded-2xl border border-line p-5`}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-3">{scheme}</p>
            <div className="gallery-width app-region mx-auto grid gap-5">{children}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The parts pages are built from (the minimal look of 2026-11-13): headings, text beside a picture, facts, a callout. */
function PageParts() {
  const id = useId();
  return (
    <>
      <SectionHead id={`g-head-${id}`} kicker="Find it again" title="Find anything, months or years later" lead="One or two sentences under the heading." />
      <SectionHead center id={`g-head-c-${id}`} title="Centred, with no label" />
      <TickList items={["Opens at the exact message or page", "Group files into collections"]} />
      <Row>{(["gpt", "claude", "gemini", "word", "pdf", "md"] as const).map((s) => <SourceBadge key={s} source={s} />)}{(["gpt", "pdf"] as const).map((s) => <SourceBadge key={`${s}-s`} source={s} small />)}</Row>
      <Card className="p-3.5">
        <DocSearch>annual discount</DocSearch>
        <DocRow selected source="claude" name="Pricing the Pro plan" meta="Claude · 14 Mar 2025" match={<>…dropping the <Hit>annual discount</Hit>…</>} />
        <DocRow source="pdf" name="Board update.pdf" meta="PDF · page 3" />
      </Card>
      <FactRow facts={[{ icon: "shield", title: "Runs on your device", text: "Nothing is uploaded." }, { icon: "check", title: "No sign-up", text: "Open a tool and use it." }, { icon: "lock", title: "Check it yourself", text: "The how-it-works page shows how." }]} />
      <Callout icon="bookmark" title="Keep it in pdf.do" text="Save this file next to your documents. Free." action={<Button variant="secondary">Keep this file</Button>} />
      <ToolChips slugs={["merge-pdf", "compress-pdf", "sign-pdf"]} label="Popular tools" />
      <Feature id={`g-feature-${id}`} kicker="Bring it in" title="Text beside a picture" lead="Two columns when there is room." ticks={["One", "Two"]} picture={<Card className="p-6 text-ink-3">The picture</Card>} />
    </>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Buttons() {
  const [pressed, setPressed] = useState("1 MB");
  const [segment, setSegment] = useState("draw");
  const id = useId();
  return (
    <>
      <Row>
        <Button size="lg">Compress PDF</Button>
        <Button variant="success" size="lg" icon="download">Download PDF</Button>
      </Row>
      <Row>
        <Button variant="secondary" icon="upload">Choose a different file</Button>
        <Button variant="ghost">Start over</Button>
        <Button variant="danger" icon="trash">Delete 3 pages</Button>
      </Row>
      <Row>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
        <ButtonLink href="/merge-pdf" variant="secondary" icon="merge">Merge PDF</ButtonLink>
      </Row>
      <Row>
        <IconButton icon="arrow-up" label="Move up" />
        <IconButton icon="arrow-down" label="Move down" />
        <IconButton icon="rotate" label="Rotate" />
        <IconButton icon="trash" label="Remove" tone="danger" />
        <IconButton icon="close" label="Close" disabled />
      </Row>
      <Row>
        {["1 MB", "2 MB", "5 MB"].map((s) => <Chip key={s} pressed={pressed === s} onClick={() => setPressed(s)}>{s}</Chip>)}
      </Row>
      <Segmented legend="Signature" name={`seg-${id}`} value={segment} onChange={setSegment}
        options={[{ value: "draw", label: "Draw" }, { value: "type", label: "Type" }, { value: "upload", label: "Upload" }]} />
      <p>A link inside text: <TextLink href="/how-it-works">How it works</TextLink>.</p>
    </>
  );
}

function Spinners() {
  return (
    <>
      <Row><Spinner size={16} /><Spinner size={20} /><Spinner size={24} /><Spinner size={40} /></Row>
      <Row><Spinner size={28} value={0.25} /><Spinner size={28} value={0.6} /><Spinner size={28} value={0.9} /></Row>
      <Row><Spinner label="Recognising text on page 4 of 20" /><span aria-hidden="true">Recognising text on page 4 of 20…</span></Row>
      <Progress label="Merging… 62%" value={0.62} onCancel={() => {}} />
      <Progress label="Optimising structure and images…" />
    </>
  );
}

function Fields() {
  const [mode, setMode] = useState("smart");
  const [opacity, setOpacity] = useState(40);
  const [size, setSize] = useState("200");
  const [text, setText] = useState("");
  const [pw, setPw] = useState("");
  const id = useId();
  return (
    <>
      <TextField label="File name" defaultValue="merged.pdf" hint="The .pdf is added for you." />
      <TextField label="Pages to keep" defaultValue="2, 5-" error="Page 5- is not a range. Try 5-7." />
      <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} hint="It stays in this tab." />
      <SelectField label="Resolution" defaultValue="150"><option value="150">150 dpi</option><option value="110">110 dpi</option><option value="80">80 dpi</option></SelectField>
      <TextField label="Make it at most (KB)" inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} />
      <TextArea label="Paste your text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste Markdown or plain text here" />
      <Slider label="Opacity" min={10} max={100} value={opacity} onChange={setOpacity} format={(v) => `${v}%`} />
      <Checkbox defaultChecked>Keep bookmarks when possible</Checkbox>
      <OptionCards legend="How should it be compressed?" name={`mode-${id}`} value={mode} onChange={setMode}
        options={[{ value: "smart", label: "Smart", description: "Smaller file, and text stays selectable." }, { value: "target", label: "Target size", description: "Keeps going, even by turning pages into images, until it fits." }]} />
    </>
  );
}

function Surfaces() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Card className="p-4"><p className="font-semibold">annual-report-2025.pdf</p><p className="text-sm text-ink-3">48 pages · 9.1 MB</p></Card>
      <Row>
        <Badge>48 pages</Badge><Badge tone="warn" icon="alert">Text not selectable</Badge><Badge tone="bad" icon="lock">Password-protected</Badge>
        <Badge tone="ok" icon="check">Saved 93%</Badge><Badge tone="info">Reading…</Badge><Badge tone="act">New</Badge>
      </Row>
      {open && <Alert tone="info" onDismiss={() => setOpen(false)}>Carried over from Merge PDF.</Alert>}
      <Alert tone="warn" title="That is every page.">Keep at least one.</Alert>
      <Alert tone="error" title="This PDF is password-protected." action={<Button variant="secondary" size="sm" icon="lock">Enter password</Button>}>Enter the password to continue.</Alert>
      <Alert tone="success">Copied to the clipboard.</Alert>
      <Disclosure summary="More options"><SelectField label="Resolution"><option>150 dpi</option><option>110 dpi</option></SelectField><Checkbox>Keep bookmarks</Checkbox></Disclosure>
      <div className="grid grid-cols-3 gap-3"><Skeleton className="aspect-[3/4]" /><Skeleton className="aspect-[3/4]" /><Skeleton className="aspect-[3/4]" /></div>
    </>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  return (
    <>
      <Row><Button variant="secondary" onClick={() => setOpen(true)}>Open the dialog</Button></Row>
      <Dialog open={open} onClose={() => setOpen(false)} title="This file needs a password" description="The password stays in your browser. It is not sent anywhere."
        actions={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Unlock and continue</Button></>}>
        <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Dialog>
    </>
  );
}

/** A File that reports the size we want to show, without holding that many bytes. */
function fake(name: string, size: number): File {
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function ToolFiles() {
  const [items, setItems] = useState<FileItem[]>(() => [
    { id: 1, file: fake("invoice-march.pdf", 215_040), pages: 3 },
    { id: 2, file: fake("receipts.pdf", 5_033_164), pages: 12 },
    { id: 3, file: fake("scan-0042.pdf", 880_000), error: "This PDF is password-protected." },
    { id: 4, file: fake("contract.pdf", 120_000) },
  ]);
  const [picked, setPicked] = useState("");
  const [range, setRange] = useState("2, 5-");
  return (
    <>
      <FileCard file={fake("annual-report-2025.pdf", 9_541_000)} pages={48} onReplace={() => {}} />
      <FileCard file={fake("annual-report-2025.pdf", 9_541_000)} pages={48} dim onReplace={() => {}} />
      <FileList
        items={items}
        onMove={(i, d) => setItems((cur) => { const next = [...cur]; [next[i], next[i + d]] = [next[i + d], next[i]]; return next; })}
        onRemove={(id) => setItems((cur) => cur.filter((x) => x.id !== id))}
      />
      <RangeField label="Pages to delete" value={range} onChange={setRange} error={range === "2, 5-" ? "Pages go from 1 to 3." : undefined} />
      <SelectionToolbar onAll={() => setPicked("all")} onClear={() => setPicked("none")} onInvert={() => setPicked("inverted")} />
      <p className="text-sm text-ink-3" aria-live="polite">Last choice: {picked || "none"}</p>
    </>
  );
}

function ToolRunning() {
  const [cancelled, setCancelled] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <>
      <Row><Button loading>Compressing…</Button><Button variant="secondary" loading>Saving…</Button></Row>
      <JobProgress label="Optimising structure and images…" sublabel="Your file stays on this device." onCancel={() => setCancelled(true)}
        stages={[{ name: "Reading", state: "done" }, { name: "Optimising", state: "now" }, { name: "Packaging", state: "todo" }]} />
      {cancelled && <p className="text-sm text-ink-3" role="status">Cancelled.</p>}
      <JobProgress label="Merging… 62%" value={0.62} />
      <div className="overflow-auto rounded-2xl border border-line-soft" style={{ maxHeight: "11rem" }} tabIndex={0} aria-label="A scrolling page with an action bar">
        <div className="px-4 pt-4"><p className="text-sm text-ink-3">The action bar sticks to the bottom edge when its container is narrow, and sits inline when it is wide.</p><div className="h-28" /></div>
        <div className="px-4 pb-1"><ActionBar><Button size="lg">Compress PDF</Button></ActionBar></div>
      </div>
      <Row><Button variant="secondary" onClick={() => setShown(!shown)}>{shown ? "Hide the result panel" : "Show the result panel"}</Button></Row>
      {shown && (
        <ResultPanel testId="gallery-result" url="#" file={fake("report-compressed.pdf", 658_000)} fromTool="Compress PDF" nextSlugs={["merge-pdf", "delete-pdf-pages"]}
          downloadLabel="Download compressed PDF" onReset={() => setShown(false)}
          summary={<p className="text-lg">9.1 MB → <strong>643 KB</strong> <span className="font-semibold text-success-ink">(93% smaller)</span></p>}>
          <SizeComparison before={9_541_000} after={658_000} />
          <p className="note">Structure optimised, and images recompressed where that saves space. Text stays selectable.</p>
        </ResultPanel>
      )}
      {/* The other name for the quiet button: a tool whose reset also clears its files says "Start over". */}
      {shown && (
        <ResultPanel testId="gallery-result-clears" focusOnArrival={false} url="#" file={fake("merged.pdf", 400_000)} fromTool="Merge PDF" nextSlugs={[]}
          downloadLabel="Download the merged file" startsOver onReset={() => setShown(false)}
          summary={<p className="text-lg"><strong>12 pages</strong> · 391 KB</p>} />
      )}
      <Row><DownloadButton url="#" file={fake("merged.pdf", 400_000)}>Download merged PDF</DownloadButton></Row>
    </>
  );
}

function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error("Deliberate failure for the gallery");
  return <p className="text-ink-3">This tool is working.</p>;
}

function Crash() {
  const [armed, setArmed] = useState(false);
  return (
    <>
      <EmptyState icon="file" title="No files yet">Choose PDFs to start.</EmptyState>
      <ErrorBoundary><Bomb armed={armed} /></ErrorBoundary>
      {!armed && <Row><Button variant="secondary" onClick={() => setArmed(true)}>Break this tool</Button></Row>}
    </>
  );
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** A four-page PDF made in the browser, so the page stage has something real to draw. */
function useSamplePdf(): File | null {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { PDFDocument, StandardFonts } = await import("@cantoo/pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      for (let i = 1; i <= 4; i++) {
        const page = doc.addPage([420, 560]);
        page.drawText("Quarterly report", { x: 40, y: 500, size: 24, font });
        page.drawText(`Page ${i} of 4`, { x: 40, y: 470, size: 12, font });
        for (let line = 0; line < 14; line++) page.drawText("Revenue grew in the second half, led by the new product line.", { x: 40, y: 430 - line * 20, size: 10, font });
      }
      const bytes = await doc.save();
      if (alive) setFile(new File([new Uint8Array(bytes)], "sample.pdf", { type: "application/pdf" }));
    })();
    return () => { alive = false; };
  }, []);
  return file;
}

type Mark = { x: number; y: number; anchor: Anchor | null; opacity: number };

function StageDemo() {
  const file = useSamplePdf();
  const pdf = usePdfDocument(file);
  const [page, setPage] = useState(1);
  const history = useHistory<Mark>({ x: 50, y: 50, anchor: "mc", opacity: 40 });
  const mark = history.value;
  const [stamp, setStamp] = useState({ x: 76, y: 22, size: 24 });
  return (
    <>
      <PagePreview doc={pdf.doc} page={page} onPage={setPage}
        toolbarStart={<>
          <IconButton icon="undo" label="Undo" disabled={!history.canUndo} onClick={history.undo} />
          <IconButton icon="redo" label="Redo" disabled={!history.canRedo} onClick={history.redo} />
        </>}>
        <PlacementOverlay x={mark.x} y={mark.y} rotate={-30} label="Watermark"
          onMove={(x, y) => history.preview({ ...mark, x, y, anchor: null })} onCommit={history.commit}>
          <span className="font-bold tracking-wide" style={{ fontSize: "9cqw", opacity: mark.opacity / 100 }}>CONFIDENTIAL</span>
        </PlacementOverlay>
        <PlacementOverlay x={stamp.x} y={stamp.y} size={stamp.size} label="Stamp" onMove={(x, y) => setStamp((s) => ({ ...s, x, y }))} onResize={(size) => setStamp((s) => ({ ...s, size }))}>
          <span className="block py-1 text-center text-sm font-bold">APPROVED</span>
        </PlacementOverlay>
      </PagePreview>
      <div className="flex flex-wrap items-start gap-6">
        <AnchorGrid value={mark.anchor} onChange={(a) => history.set({ ...mark, ...ANCHOR_POINTS[a], anchor: a })} />
        <NudgePad onNudge={(dx, dy) => history.set({ ...mark, x: clamp(mark.x + dx), y: clamp(mark.y + dy), anchor: null })} />
      </div>
      <Slider label="Opacity" min={10} max={100} value={mark.opacity} onChange={(opacity) => history.preview({ ...mark, opacity })} onCommit={history.commit} format={(n) => `${n}%`} />
      <p className="text-sm text-ink-3" data-testid="mark-position">Mark at {Math.round(mark.x)}%, {Math.round(mark.y)}%</p>
      <p className="text-sm text-ink-3" data-testid="stamp-size">Stamp {Math.round(stamp.size)}%</p>
    </>
  );
}

/** Small real PDFs for the several-files result: what Split PDF would hand back. */
function useSampleOutputs(): OutputFile[] | null {
  const [outputs, setOutputs] = useState<OutputFile[] | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { PDFDocument, StandardFonts } = await import("@cantoo/pdf-lib");
      const names = ["invoice-part-1.pdf", "invoice-part-2.pdf", "annual-report-2025-final-signed-version-with-appendix-part-3-of-12.pdf"];
      const made: OutputFile[] = [];
      for (const [i, name] of names.entries()) {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        for (let n = 1; n <= 2; n++) doc.addPage([420, 560]).drawText(`${name}, page ${n}`, { x: 40, y: 500, size: 12, font });
        const bytes = await doc.save();
        made.push({ id: i + 1, file: new File([new Uint8Array(bytes)], name, { type: "application/pdf" }), detail: "2 pages" });
      }
      if (alive) setOutputs(made);
    })();
    return () => { alive = false; };
  }, []);
  return outputs;
}

/** Pictures of the sample PDF's pages as JPEG: what PDF to JPG would hand back. */
function useSampleImages(): GalleryImage[] | null {
  const pdf = usePdfDocument(useSamplePdf());
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  useEffect(() => {
    const doc = pdf.doc;
    if (!doc) return;
    let alive = true;
    void (async () => {
      const made: GalleryImage[] = [];
      for (let n = 1; n <= 3; n++) {
        const canvas = document.createElement("canvas");
        await doc.render(n, canvas, 420, { dpr: 1 });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
        if (blob) made.push({ id: n, file: new File([blob], `page-${n}.jpg`, { type: "image/jpeg" }), label: `Page ${n}` });
      }
      if (alive) setImages(made);
    })();
    return () => { alive = false; };
  }, [pdf.doc]);
  return images;
}

function ResultsFiles() {
  const outputs = useSampleOutputs();
  if (!outputs) return <Skeleton className="h-24" />;
  return (
    <>
      <ResultPanel testId="multi-result" fromTool="split-pdf" nextSlugs={[]} focusOnArrival={false} onReset={() => {}} summary={<>Split into <b>{outputs.length} files</b>.</>}>
        <MultiResult outputs={outputs} zipName="invoice-split" />
      </ResultPanel>
      <p className="text-sm text-ink-3">Too big to bundle: the same files with a limit of 1 KB.</p>
      <DownloadAllLimited outputs={outputs} />
      <p className="text-sm text-ink-3">One file only: no ZIP is offered.</p>
      <MultiResult outputs={outputs.slice(0, 1)} zipName="one-file" />
    </>
  );
}

function DownloadAllLimited({ outputs }: { outputs: OutputFile[] }) {
  const files = useMemo(() => outputs.map((o) => o.file), [outputs]);
  return <DownloadAll files={files} zipName="invoice-split" maxBytes={1024} />;
}

function ResultsImages() {
  const images = useSampleImages();
  const files = useMemo(() => images?.map((i) => i.file) ?? [], [images]);
  if (!images) return <Skeleton className="h-24" />;
  return (
    <ResultPanel testId="image-result" fromTool="pdf-to-jpg" nextSlugs={[]} focusOnArrival={false} onReset={() => {}} summary={<>Saved <b>{images.length} pages</b> as pictures.</>}>
      <ImageGallery images={images} label="Pages as JPG" />
      <DownloadAll files={files} zipName="pages-as-jpg" />
    </ResultPanel>
  );
}

const SAMPLE_TEXT = "Quarterly summary. Revenue grew in the second half, led by the new product line. Costs held flat. The board approved the plan for next year.\n\nOutlook: stable, with one open risk in supply.";
const LONG_TEXT = Array.from({ length: 400 }, (_, i) => `Line ${i + 1}: Revenue grew in the second half, led by the new product line.`).join("\n");

function ResultsText() {
  return (
    <>
      <TextOutput text={SAMPLE_TEXT} label="Extracted text" filename="summary.txt" />
      <p className="text-sm text-ink-3">A long text shows its first part; Copy and Download carry all of it.</p>
      <TextOutput text={LONG_TEXT} label="Extracted text, long" filename="long.txt" limit={2000} />
    </>
  );
}

function ResultsReport() {
  return (
    <>
      <ReportList label="Privacy scan" findings={[
        { id: 1, tone: "warn", label: "Found", title: "Author name", detail: "Stored in the file's properties." },
        { id: 2, tone: "bad", label: "Found", title: "GPS location", detail: "On 2 images." },
        { id: 3, tone: "ok", label: "Clear", title: "Tracked changes", detail: "None." },
        { id: 4, tone: "info", label: "Note", title: "Embedded fonts", detail: "Three fonts are stored in the file." },
      ]} />
      <FactList label="About this file" facts={[
        { label: "Pages", value: "48" },
        { label: "Created with", value: "A word processor, 2025" },
        { label: "Size", value: "9.1 MB" },
        { label: "A long value", value: "annual-report-2025-final-signed-version-with-appendix-part-3-of-12-and-more.pdf" },
      ]} />
      <BreakdownBar label="What takes the space" parts={[
        { id: "images", label: "Images", bytes: 7_340_000 },
        { id: "fonts", label: "Fonts", bytes: 1_100_000 },
        { id: "text", label: "Text and layout", bytes: 520_000 },
        { id: "meta", label: "Everything else", bytes: 140_000 },
        { id: "tiny", label: "Bookmarks", bytes: 2_000 },
      ]} />
    </>
  );
}

type Grid = { pages: GridPage[] };

function GridDemo() {
  const file = useSamplePdf();
  const pdf = usePdfDocument(file);
  const { urls, request } = useThumbs(pdf.doc, 160);
  const history = useHistory<Grid>({ pages: [1, 2, 3, 4].map((n) => ({ id: n, n, rotate: 0 })) });
  const [selected, setSelected] = useState<number | null>(1);
  const pages = history.value.pages;
  const at = selected === null ? null : Math.min(selected, pages.length - 1);
  return (
    <>
      <Row>
        <IconButton icon="undo" label="Undo" disabled={!history.canUndo} onClick={history.undo} />
        <IconButton icon="redo" label="Redo" disabled={!history.canRedo} onClick={history.redo} />
      </Row>
      <PageGrid pages={pages} selected={at} urls={urls} request={request}
        onSelect={setSelected}
        onMove={(i, d) => { const next = [...pages]; [next[i], next[i + d]] = [next[i + d], next[i]]; history.set({ pages: next }); setSelected(i + d); }}
        onRotate={(i) => history.set({ pages: pages.map((p, j) => (j === i ? { ...p, rotate: (p.rotate + 90) % 360 } : p)) })}
        onDelete={(i) => { history.set({ pages: pages.filter((_, j) => j !== i) }); setSelected(Math.min(i, pages.length - 2)); }} />
      <p className="text-sm text-ink-3" data-testid="grid-order">Order: {pages.map((p) => p.n).join(", ")}</p>
    </>
  );
}

function Icons() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {ICON_NAMES.map((name) => (
        <div key={name} className="flex flex-col items-center gap-1 text-center text-xs text-ink-3">
          <Icon name={name} className="h-6 w-6 text-ink" />
          {name}
        </div>
      ))}
    </div>
  );
}

function Typography() {
  return (
    <>
      <p className="text-4xl font-bold tracking-tight">Compress PDF</p>
      <p className="text-lg text-ink-2">Make a PDF smaller, or hit an exact size. Smart keeps text selectable.</p>
      <p className="font-normal">Regular 400. The quick brown fox jumps over the lazy dog.</p>
      <p className="font-medium">Medium 500. The quick brown fox jumps over the lazy dog.</p>
      <p className="font-semibold">Semibold 600. The quick brown fox jumps over the lazy dog.</p>
      <p className="font-bold">Bold 700. The quick brown fox jumps over the lazy dog.</p>
      <p>Characters in use: … · — – →</p>
      <p className="text-ink-3">0123456789 · 9.1 MB → 643 KB (93% smaller) · 1,024 pages · 12:45</p>
    </>
  );
}

function ToastDemo() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  function progress() {
    let value = 0;
    const handle = notify.progress({
      title: "Downloading the language data", text: "Used for text recognition. 4 MB, once.", value,
      onCancel: () => { if (timer.current) clearInterval(timer.current); notify.status("Download cancelled"); },
    });
    timer.current = setInterval(() => {
      value = Math.min(1, value + 0.1);
      if (value >= 1) { if (timer.current) clearInterval(timer.current); handle.done("Language data ready", "Recognition runs on this device."); }
      else handle.update({ value });
    }, 400);
  }
  return (
    <Row>
      <Button variant="secondary" onClick={() => notify.status("3 files added", { text: "Put them in order, then merge." })}>Status toast</Button>
      <Button variant="secondary" onClick={progress}>Progress toast</Button>
      <Button variant="secondary" onClick={() => notify.error("receipts.pdf could not be read", { text: "It may be damaged. The other files are fine.", action: { label: "Remove it" } })}>Error toast</Button>
      <Button variant="ghost" onClick={() => notify.dismissAll()}>Clear all</Button>
    </Row>
  );
}

const WIDTHS = [{ value: "320", label: "320" }, { value: "375", label: "375" }, { value: "768", label: "768" }, { value: "full", label: "Full" }];

export function Gallery() {
  const [width, setWidth] = useState("full");
  const [scheme, setScheme] = useState<Scheme>("light");

  // The toasts are drawn at the page root, so the page scheme decides how they look.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = scheme;
    return () => { delete root.dataset.theme; };
  }, [scheme]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Component gallery</h1>
      <p className="mt-2 max-w-3xl text-ink-2">Every block in light and dark, side by side. Development only: this page is not in the production build. Match the approved mocks.</p>
      <style>{`.gallery-width { max-width: ${width === "full" ? "none" : `${width}px`}; }`}</style>
      <div className="mt-5 flex flex-wrap items-start gap-6">
        <Segmented legend="Width of each panel (px)" name="gallery-width" value={width} onChange={setWidth} options={WIDTHS} />
        <Segmented legend="Page scheme (toasts, scrollbars)" name="gallery-scheme" value={scheme} onChange={(v) => setScheme(v as Scheme)} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </div>

      <Specimen title="Buttons and choices" note="One primary per state. Ghost is the quiet role. Success is only the download. Every target is 44 px, small buttons 40."><Buttons /></Specimen>
      <Specimen title="Spinner and progress" note="A spinner means working with no known end; a ring or bar means the fraction is known."><Spinners /></Specimen>
      <Specimen title="Fields"><Fields /></Specimen>
      <Specimen title="Surfaces and messages"><Surfaces /></Specimen>
      <Specimen title="Page parts" note="What the home page and tool pages are built from: a section heading, ticks, source badges, document rows, facts, a callout, tool chips, text beside a picture."><PageParts /></Specimen>
      <Specimen title="Dialog" note="The browser's own dialog element: focus is trapped, Escape closes, and a phone gets a sheet."><DialogDemo /></Specimen>
      <Specimen title="Tool blocks: files and pages" note="The file card, the reorderable list, the range field and the selection tools."><ToolFiles /></Specimen>
      <Specimen title="Tool blocks: running and result" note="Progress in the place of the button, the action bar, and the finished-work panel."><ToolRunning /></Specimen>
      <Specimen title="Page stage: preview and placement" note="One page drawn big, with a watermark and a stamp placed on it by drag, keys or buttons, and undo."><StageDemo /></Specimen>
      <Specimen title="Page stage: page grid" note="Pick a page, then move, turn or delete it with buttons. Nothing needs dragging."><GridDemo /></Specimen>
      <Specimen title="Results: text" note="Read it, copy it, download it. A long text shows its first part."><ResultsText /></Specimen>
      <Specimen title="Results: report" note="Findings with a word on each badge, facts as pairs, and a breakdown bar that is also a list."><ResultsReport /></Specimen>
      <Specimen title="Empty and crash states"><Crash /></Specimen>
      <Specimen title="Icons"><Icons /></Specimen>
      <Specimen title="Typography" note="Google Sans, served from this site."><Typography /></Specimen>

      <section className="mt-12" aria-labelledby="s-toasts">
        <h2 id="s-toasts" className="text-2xl font-bold tracking-tight">Toasts</h2>
        <p className="mt-1 max-w-3xl text-ink-3">Drawn at the page root, bottom right (above the sticky bar on a phone). They follow the page scheme chosen above.</p>
        <div className="mt-4"><ToastDemo /></div>
      </section>

      {/* These two build their files in the browser and grow when they are ready, so they come last: nothing below them can be moved. */}
      <Specimen title="Results: several files and a ZIP" note="One row per file with its own download, and one green button for the ZIP. The ZIP is made in a worker and names its size."><ResultsFiles /></Specimen>
      <Specimen title="Results: pictures" note="Tiles with a download each and a larger view in a dialog, then the ZIP."><ResultsImages /></Specimen>
    </div>
  );
}
