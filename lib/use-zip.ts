"use client";

import { useEffect, useState } from "react";
import { zipFiles } from "./engines";
import { uniqueEntryNames, zipFileName } from "./zip-names";

/** Above this many bytes in all, the outputs are not bundled: a phone would hold them twice (as files and as the ZIP). */
export const MAX_ZIP_BYTES = 200 * 1024 * 1024;

export type ZipState =
  | { status: "making"; progress: number }
  | { status: "ready"; file: File; url: string }
  | { status: "too-large"; bytes: number }
  | { status: "failed" };

const MAKING: ZipState = { status: "making", progress: 0 };

/**
 * Makes one ZIP of several files, in a worker, as soon as the files are there (so its size is known for the button).
 * A newer list of files cancels the older job, and the ZIP's object URL is revoked when it is replaced or the component
 * goes away. Pass an array that only changes when the files do.
 */
export function useZip(files: readonly File[], zipName: string, maxBytes = MAX_ZIP_BYTES): ZipState {
  const total = files.reduce((n, f) => n + f.size, 0);
  const tooLarge = total > maxBytes;
  const [state, setState] = useState<{ files: readonly File[]; value: ZipState }>({ files, value: MAKING });

  useEffect(() => {
    if (tooLarge) return;
    const controller = new AbortController();
    let url: string | null = null;
    void (async () => {
      try {
        const names = uniqueEntryNames(files.map((f) => f.name));
        const entries = await Promise.all(files.map(async (f, i) => ({ name: names[i], buffer: await f.arrayBuffer() })));
        const blob = await zipFiles(entries, (progress) => setState({ files, value: { status: "making", progress } }), controller.signal);
        const file = new File([blob], zipFileName(zipName), { type: "application/zip" });
        url = URL.createObjectURL(file);
        setState({ files, value: { status: "ready", file, url } });
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setState({ files, value: { status: "failed" } });
      }
    })();
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [files, zipName, tooLarge]);

  if (tooLarge) return { status: "too-large", bytes: total };
  // Whatever was made for an older list of files is never shown for a newer one.
  return state.files === files ? state.value : MAKING;
}
