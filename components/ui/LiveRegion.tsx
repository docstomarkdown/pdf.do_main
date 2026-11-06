"use client";

import { useEffect, useState } from "react";

// One polite live region for the whole page, so toasts, progress and results do not each make their own.
let setText: ((text: string) => void) | null = null;

/** Say something to screen readers without showing it. Repeating the same message is announced again. */
export function announce(message: string): void {
  setText?.("");
  setTimeout(() => setText?.(message), 50);
}

/** Mount once, in the root layout. */
export function LiveRegion() {
  const [text, set] = useState("");
  useEffect(() => {
    setText = set;
    return () => { setText = null; };
  }, []);
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{text}</div>;
}
