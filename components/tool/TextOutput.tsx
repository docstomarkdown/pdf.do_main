"use client";

import { useMemo } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { useObjectUrls } from "@/lib/use-object-urls";

/** The text of a result: read it here, copy it, or download it. */
export function TextOutput({ text, label, filename = "text.txt", limit = 20000 }: {
  text: string;
  /** What the text is, for screen readers ("Extracted text"). */
  label: string;
  filename?: string;
  /** How many characters to show. Copy and Download always carry all of it. */
  limit?: number;
}) {
  const file = useMemo(() => new File([text], filename, { type: "text/plain;charset=utf-8" }), [text, filename]);
  const blobs = useMemo(() => [file], [file]);
  const [url] = useObjectUrls(blobs);
  const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : ".txt";
  const cut = text.length > limit;

  return (
    <div className="grid gap-2.5">
      {/* A box that scrolls must be reachable by keyboard, so it can take focus. */}
      <div role="region" aria-label={label} tabIndex={0} className="textout">{cut ? text.slice(0, limit) : text}</div>
      {cut && (
        <p className="hint" style={{ marginTop: 0 }}>
          Showing the first {limit.toLocaleString("en")} of {text.length.toLocaleString("en")} characters. Copy and Download include all of it.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={text} />
        {url ? (
          <ButtonLink href={url} download={filename} variant="secondary" icon="download">Download {extension}</ButtonLink>
        ) : (
          <Button variant="secondary" icon="download" disabled>Download {extension}</Button>
        )}
      </div>
    </div>
  );
}
