"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { notify } from "./Notifier";

/**
 * Copies text to the clipboard. The label turns to "Copied" for two seconds and a status toast says so too (the toast
 * is what a screen reader hears). If the browser refuses, an error says so in plain words and nothing claims success.
 * `text` may be a function, so a long text is only built when the button is pressed.
 */
export function CopyButton({ text, label = "Copy text", className }: { text: string | (() => string); label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
    } catch {
      notify.error("Could not copy", { text: "Your browser blocked it. Select the text and copy it yourself." });
      return;
    }
    setCopied(true);
    notify.status("Copied to the clipboard");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" icon={copied ? "check" : "copy"} className={className} onClick={() => void copy()}>
      {copied ? "Copied" : label}
    </Button>
  );
}
