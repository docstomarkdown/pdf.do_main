"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { isPdf } from "@/lib/format";

/** The one place files come in. `compact` shrinks it to a single button once a file is chosen. */
export function FileDrop({
  onFiles, multiple = false, label, compact = false,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter(isPdf);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  // The visible button is the real control. The input is hidden from assistive technology so it is not announced as a duplicate.
  const hidden = (
    <input
      ref={input}
      type="file"
      accept="application/pdf,.pdf"
      multiple={multiple}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => { take(e.target.files); e.target.value = ""; }}
    />
  );

  if (compact) {
    return (
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); take(e.dataTransfer.files); }}>
        {hidden}
        <Button variant="secondary" icon="upload" onClick={() => input.current?.click()}>{label}</Button>
      </div>
    );
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
      className={`rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16 ${over ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50"}`}
    >
      {hidden}
      <Icon name="upload" className="mx-auto h-10 w-10 text-indigo-700" />
      <div className="mt-4">
        <Button size="lg" onClick={() => input.current?.click()}>{label}</Button>
      </div>
      <p className="mt-4 text-slate-700">or drop {multiple ? "PDF files" : "a PDF"} here</p>
    </div>
  );
}
