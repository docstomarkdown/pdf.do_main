"use client";

import { ActionBar } from "@/components/ui/ActionBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { formatBytes } from "@/lib/format";
import { useZip } from "@/lib/use-zip";

/**
 * The one green button for a result of several files: "Download all (ZIP, 264 KB)". The ZIP is made in a worker as soon as
 * the files are here, so the button can name its size; until then it says it is preparing. Outputs too big to hold twice are
 * not bundled and say so, and a failure leaves each file's own download working. Shows nothing for a single file.
 * Pass an array that only changes when the files do (keep it in state or `useMemo`).
 */
export function DownloadAll({ files, zipName, maxBytes }: { files: File[]; zipName: string; /** For the gallery, to show the too-large state. */ maxBytes?: number }) {
  return files.length < 2 ? null : <Bundle files={files} zipName={zipName} maxBytes={maxBytes} />;
}

function Bundle({ files, zipName, maxBytes }: { files: File[]; zipName: string; maxBytes?: number }) {
  const zip = useZip(files, zipName, maxBytes);

  if (zip.status === "too-large") {
    return <p className="hint">These {files.length} files add up to {formatBytes(zip.bytes)}, too much to bundle on this device. Download them one by one.</p>;
  }
  if (zip.status === "failed") {
    return <Alert tone="error">The ZIP could not be made. Each file can still be downloaded on its own.</Alert>;
  }
  return (
    <ActionBar className="actionbar-panel">
      {zip.status === "ready" ? (
        <DownloadButton url={zip.url} file={zip.file}>Download all (ZIP, {formatBytes(zip.file.size).replace(" ", "\u00a0")})</DownloadButton>
      ) : (
        <Button variant="success" size="lg" loading>Preparing ZIP… {Math.round(zip.progress * 100)}%</Button>
      )}
    </ActionBar>
  );
}
