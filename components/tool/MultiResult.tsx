"use client";

import { useMemo } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";
import { useObjectUrls } from "@/lib/use-object-urls";
import { DownloadAll } from "./DownloadAll";

export type OutputFile = { id: string | number; file: File; /** Shown under the name. Defaults to the size. */ detail?: string };

/**
 * A result of several files: one row each with its own Download, and one "Download all" ZIP below. Put it inside
 * `ResultPanel` (which then leaves out its single download). Each file's download works on its own, whatever happens to the ZIP.
 */
export function MultiResult({ outputs, zipName }: { outputs: OutputFile[]; zipName: string }) {
  const files = useMemo(() => outputs.map((o) => o.file), [outputs]);
  const urls = useObjectUrls(files);

  return (
    <div className="grid gap-4">
      <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-surface">
        {outputs.map((o, i) => (
          <li key={o.id} className="outrow">
            <Icon name="file" className="h-5 w-5 shrink-0 text-ink-3" />
            <div className="outrow-text">
              <p className="truncate font-medium">{o.file.name}</p>
              <p className="text-sm text-ink-3">{o.detail ?? formatBytes(o.file.size)}</p>
            </div>
            {urls[i] ? (
              <ButtonLink href={urls[i]!} download={o.file.name} variant="secondary" size="sm" icon="download" aria-label={`Download ${o.file.name}`}>Download</ButtonLink>
            ) : (
              <span className="btn btn-secondary btn-sm" aria-disabled="true">Download</span>
            )}
          </li>
        ))}
      </ul>
      <DownloadAll files={files} zipName={zipName} />
    </div>
  );
}
