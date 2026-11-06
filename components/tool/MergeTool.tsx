"use client";

import { useEffect, useRef, useState } from "react";
import { FileDrop } from "./FileDrop";
import { ResultPanel } from "./ResultPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { inspectPdf, mergePdfs } from "@/lib/engines";
import { formatBytes } from "@/lib/format";
import { clearHandoff, peekHandoff } from "@/lib/handoff";

type Item = { id: number; file: File; pages?: number; error?: string };
type Result = { url: string; file: File; pages: number };

let nextId = 1;
const NEXT = ["compress-pdf", "delete-pdf-pages", "extract-pdf-pages"];

export function MergeTool() {
  // A file handed over from another tool starts the list. Reading it during render is safe: it is not cleared here.
  const [items, setItems] = useState<Item[]>(() => {
    const h = peekHandoff();
    return h ? [{ id: nextId++, file: h.file }] : [];
  });
  const [from] = useState(() => peekHandoff()?.from);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    clearHandoff();
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, []);

  async function inspect(item: Item) {
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

  const clearResult = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setResult(null);
  };

  function add(files: File[]) {
    clearResult();
    setError(null);
    setItems((cur) => [...cur, ...files.map((file) => ({ id: nextId++, file }))]);
  }
  const move = (index: number, delta: number) => {
    clearResult();
    setItems((cur) => {
      const target = index + delta;
      if (target < 0 || target >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const remove = (id: number) => { clearResult(); setItems((cur) => cur.filter((i) => i.id !== id)); };
  const reset = () => { clearResult(); setItems([]); setError(null); };

  const usable = items.filter((i) => !i.error && i.pages !== undefined);
  const canMerge = usable.length >= 2 && usable.length === items.length && !busy;

  async function merge() {
    setBusy(true);
    setError(null);
    setProgress(0);
    clearResult();
    try {
      const buffers = await Promise.all(usable.map((i) => i.file.arrayBuffer()));
      const bytes = await mergePdfs(buffers, usable.map((i) => i.file.name), setProgress);
      const file = new File([bytes], "merged.pdf", { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setResult({ url, file, pages: usable.reduce((n, i) => n + (i.pages ?? 0), 0) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merging failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <FileDrop multiple label="Choose PDF files" onFiles={add} />
      ) : (
        <>
          {from && <Alert tone="info">Carried over from {from}. Add the other files you want to combine with it.</Alert>}
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                <span aria-hidden="true" className="w-6 text-center text-sm text-slate-600">{index + 1}</span>
                <Icon name="file" className="h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{item.file.name}</p>
                  <p className={`text-sm ${item.error ? "text-red-700" : "text-slate-600"}`}>
                    {item.error ?? (item.pages === undefined ? "Reading…" : `${item.pages} ${item.pages === 1 ? "page" : "pages"} · ${formatBytes(item.file.size)}`)}
                  </p>
                </div>
                <Button variant="ghost" aria-label={`Move ${item.file.name} up`} disabled={index === 0} onClick={() => move(index, -1)} className="px-2.5"><Icon name="arrow-up" /></Button>
                <Button variant="ghost" aria-label={`Move ${item.file.name} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)} className="px-2.5"><Icon name="arrow-down" /></Button>
                <Button variant="ghost" aria-label={`Remove ${item.file.name}`} onClick={() => remove(item.id)} className="px-2.5 text-red-700 hover:bg-red-50"><Icon name="close" /></Button>
              </li>
            ))}
          </ul>
          <FileDrop multiple compact label="Add more PDFs" onFiles={add} />
        </>
      )}

      {items.length > 0 && usable.length < 2 && !error && !result && (
        <p className="text-sm text-slate-700">Add at least two PDFs to merge.</p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {busy && <Progress value={progress} label={`Merging… ${Math.round(progress * 100)}%`} />}

      {!result && items.length > 0 && (
        <Button size="lg" disabled={!canMerge} onClick={merge} className="w-full sm:w-auto">Merge PDFs</Button>
      )}

      {result && (
        <ResultPanel
          testId="merge-result"
          url={result.url}
          file={result.file}
          fromTool="Merge PDF"
          nextSlugs={NEXT}
          downloadLabel="Download merged PDF"
          onReset={reset}
          summary={<p className="text-lg"><strong>{result.pages} pages</strong> · {formatBytes(result.file.size)}</p>}
        />
      )}
    </div>
  );
}
