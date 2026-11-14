"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatBytes, isPdf } from "@/lib/format";
import { MAX_BYTES } from "@/lib/limits";

type Accept = "pdf" | "images" | "any";
const keep: Record<Accept, (file: File) => boolean> = { pdf: isPdf, images: (f) => f.type.startsWith("image/"), any: () => true };
const attribute: Record<Accept, string | undefined> = { pdf: "application/pdf,.pdf", images: "image/*", any: undefined };
const nouns: Record<Accept, { one: string; many: string }> = {
  pdf: { one: "a PDF", many: "PDF files" },
  images: { one: "an image", many: "images" },
  any: { one: "a file", many: "files" },
};

/** The one place files come in. `compact` shrinks it to a single button once a file is chosen. */
export function FileDrop({
  onFiles, multiple = false, label, compact = false, accept = "pdf", disabled = false, capture = false, wide = false,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label: string;
  compact?: boolean;
  accept?: Accept;
  disabled?: boolean;
  /** On a phone, open the camera instead of the photo library. Other devices ignore it and show the file chooser. */
  capture?: boolean;
  /** With `compact`: a full-width button with a dashed edge, for "Add more" under a list of files. */
  wide?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState("");

  const take = (list: FileList | null) => {
    if (disabled) return;
    const wanted = Array.from(list ?? []).filter(keep[accept]);
    const files = wanted.filter((f) => f.size <= MAX_BYTES);
    const refused = wanted.filter((f) => f.size > MAX_BYTES);
    setNotice(refused.length ? `${refused[0].name} is ${formatBytes(refused[0].size)}. A browser tab cannot hold a file over ${formatBytes(MAX_BYTES)} safely, so it was not opened.` : "");
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  // The visible button is the real control. The input is hidden from assistive technology so it is not announced as a duplicate.
  const hidden = (
    <input
      ref={input}
      type="file"
      accept={attribute[accept]}
      multiple={multiple}
      capture={capture ? "environment" : undefined}
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
        <Button variant="secondary" icon={wide ? "plus" : "upload"} className={wide ? "btn-dashed" : ""} disabled={disabled} onClick={() => input.current?.click()}>{label}</Button>
        {notice && <Alert tone="error" className="mt-3">{notice}</Alert>}
      </div>
    );
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
      className={`dropzone px-6 py-12 sm:py-16 ${over ? "dropzone-over" : ""}`.trim()}
    >
      {hidden}
      <span className="dropzone-icon"><Icon name="upload" className="h-7 w-7" /></span>
      <div className="mt-4">
        <Button size="lg" onClick={() => input.current?.click()}>{label}</Button>
      </div>
      <p className="mt-4 text-ink-2">or drop {multiple ? nouns[accept].many : nouns[accept].one} here</p>
      {notice && <Alert tone="error" className="mx-auto mt-4 max-w-xl text-left">{notice}</Alert>}
    </div>
  );
}
