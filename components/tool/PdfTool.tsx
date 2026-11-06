"use client";

import { useState, type ReactNode } from "react";
import { FileDrop } from "./FileDrop";
import { Alert } from "@/components/ui/Alert";
import { formatBytes } from "@/lib/format";
import { WARN_BYTES } from "@/lib/limits";
import { useHandoff } from "@/lib/use-handoff";

let serial = 0;

/**
 * The start of every tool that takes one PDF: the drop zone until a file is chosen (or one is handed over by the
 * previous tool), then `children` with the file. The workspace is remounted for each new file, so no state leaks across.
 */
export function PdfTool({ label = "Choose a PDF", children }: {
  label?: string;
  children: (workspace: { file: File; from?: string; onChoose: (file: File) => void }) => ReactNode;
}) {
  const { file: handed, from } = useHandoff();
  const [chosen, setChosen] = useState<{ file: File; id: number } | null>(() => (handed ? { file: handed, id: ++serial } : null));
  if (!chosen) return <FileDrop label={label} onFiles={(f) => setChosen({ file: f[0], id: ++serial })} />;
  const onChoose = (file: File) => setChosen({ file, id: ++serial });
  return (
    <div key={chosen.id}>
      {chosen.file.size > WARN_BYTES && (
        <Alert tone="warn" className="mb-6">
          This file is large ({formatBytes(chosen.file.size)}). Everything happens in this browser tab, and big files use a lot of memory: a phone may close the tab. If that happens, try a computer or a smaller file.
        </Alert>
      )}
      {children({ file: chosen.file, from, onChoose })}
    </div>
  );
}
