"use client";

import { useEffect, useState } from "react";

/**
 * Download links for files made in the browser. Each file gets an object URL, and every URL is revoked when the files
 * change or the component goes away, so no tool ever revokes by hand. Pass an array that only changes when the files do
 * (keep it in state or `useMemo`). `urls[i]` is `undefined` for the first moment after the files arrive, so a link
 * should wait for it.
 */
export function useObjectUrls(blobs: readonly Blob[]): (string | undefined)[] {
  const [made, setMade] = useState<{ blobs: readonly Blob[]; urls: string[] } | null>(null);

  useEffect(() => {
    let alive = true;
    const urls = blobs.map((b) => URL.createObjectURL(b));
    // Handed to React a moment later, as a result arriving from outside, so a remount (React's development check) that
    // revokes these first never leaves a stale list behind.
    void Promise.resolve().then(() => { if (alive) setMade({ blobs, urls }); });
    return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [blobs]);

  // URLs made for an older list are not handed out for a newer one.
  return made && made.blobs === blobs ? made.urls : blobs.map(() => undefined);
}
