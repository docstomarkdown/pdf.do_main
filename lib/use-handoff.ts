"use client";

import { useEffect, useState } from "react";
import { clearHandoff, holdFile, peekHandoff } from "./handoff";

/**
 * The file (and the name of the tool it came from) that another tool handed over with "Keep going with this file".
 * Read once on first render, cleared on mount so a reload or a later visit starts empty. Nothing is stored.
 */
export function useHandoff(): { file: File | null; from: string | undefined } {
  // Reading during render is safe: peekHandoff does not clear (React may render twice in development).
  const [handed] = useState(() => peekHandoff());
  useEffect(() => { clearHandoff(); }, []);
  return { file: handed?.file ?? null, from: handed?.from };
}

/**
 * Tells the hand-over which file this tool has open, so a `CarryLink` to the same tool at another address can take it
 * along. Let go when the file changes and when the tool leaves the page.
 */
export function useHeldFile(file: File | null, from: string): void {
  useEffect(() => {
    holdFile(file, from);
    return () => holdFile(null, from);
  }, [file, from]);
}
