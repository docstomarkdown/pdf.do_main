"use client";

import { useEffect, useRef, useState } from "react";
import { FileDrop } from "./FileDrop";
import { FileList, type FileItem } from "./FileList";
import { ResultPanel } from "./ResultPanel";
import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgress } from "@/components/ui/JobProgress";
import { inspectPdf, mergePdfs } from "@/lib/engines";
import { formatBytes } from "@/lib/format";
import { useHandoff } from "@/lib/use-handoff";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { useToolJob } from "@/lib/use-tool-job";

let nextId = 1;
const NEXT = ["compress-pdf", "delete-pdf-pages", "extract-pdf-pages"];

export function MergeTool() {
  const { file: handed, from } = useHandoff();
  // A file handed over from another tool starts the list.
  const [items, setItems] = useState<FileItem[]>(() => (handed ? [{ id: nextId++, file: handed }] : []));
  const job = useToolJob<{ file: File; pages: number }>();
  useLeaveGuard(job.busy);

  async function inspect(item: FileItem) {
    try {
      const pages = await inspectPdf(await item.file.arrayBuffer());
      setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, pages } : i)));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not read this file.";
      setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, error: message } : i)));
    }
  }

  // Inspect any item that has no page count yet (including a handed-over file).
  const pending = items.filter((i) => i.pages === undefined && !i.error);
  const pendingKey = pending.map((i) => i.id).join(",");
  const inspecting = useRef(new Set<number>());
  useEffect(() => {
    for (const item of items) {
      if (item.pages !== undefined || item.error || inspecting.current.has(item.id)) continue;
      inspecting.current.add(item.id);
      void inspect(item);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  function add(files: File[]) {
    job.reset();
    setItems((cur) => [...cur, ...files.map((file) => ({ id: nextId++, file }))]);
  }
  const move = (index: number, delta: number) => {
    job.reset();
    setItems((cur) => {
      const target = index + delta;
      if (target < 0 || target >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const remove = (id: number) => { job.reset(); setItems((cur) => cur.filter((i) => i.id !== id)); };
  const reset = () => { job.reset(); setItems([]); };

  const usable = items.filter((i) => !i.error && i.pages !== undefined);
  const canMerge = usable.length >= 2 && usable.length === items.length && !job.busy;

  function merge() {
    void job.run(async ({ setProgress }) => {
      const buffers = await Promise.all(usable.map((i) => i.file.arrayBuffer()));
      const bytes = await mergePdfs(buffers, usable.map((i) => i.file.name), setProgress);
      const file = new File([bytes], "merged.pdf", { type: "application/pdf" });
      return { file, pages: usable.reduce((n, i) => n + (i.pages ?? 0), 0) };
    }, "Merging failed.");
  }

  const percent = Math.round((job.progress ?? 0) * 100);

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <FileDrop multiple label="Choose PDF files" onFiles={add} />
      ) : (
        <>
          {from && <Alert tone="info">Carried over from {from}. Add the other files you want to combine with it.</Alert>}
          <FileList items={items} onMove={move} onRemove={remove} />
          <FileDrop multiple compact label="Add more PDFs" onFiles={add} />
        </>
      )}

      {items.length > 0 && usable.length < 2 && !job.error && !job.result && (
        <p className="text-sm text-ink-2">Add at least two PDFs to merge.</p>
      )}
      {job.error && <Alert tone="error">{job.error}</Alert>}

      {!job.result && items.length > 0 && (
        <ActionBar>
          {job.busy ? (
            <div className="min-w-0 flex-1"><JobProgress label={`Merging… ${percent}%`} value={job.progress ?? 0} sublabel="Your files stay on this device." /></div>
          ) : (
            <Button size="lg" disabled={!canMerge} onClick={merge}>Merge PDFs</Button>
          )}
        </ActionBar>
      )}

      {job.result && (
        <ResultPanel
          testId="merge-result"
          url={job.result.url}
          file={job.result.file}
          fromTool="Merge PDF"
          nextSlugs={NEXT}
          downloadLabel="Download merged PDF"
          onReset={reset}
          summary={<p className="text-lg"><strong>{job.result.pages} pages</strong> · {formatBytes(job.result.file.size)}</p>}
        />
      )}
    </div>
  );
}
