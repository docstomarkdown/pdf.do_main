"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconLink } from "@/components/ui/IconLink";
import { formatBytes } from "@/lib/format";
import { useObjectUrls } from "@/lib/use-object-urls";

export type GalleryImage = { id: string | number; file: File; /** What it is ("Page 3"). Read out for each picture. */ label: string; detail?: string };

/**
 * Pictures a tool made (pages as JPG, images pulled out of a PDF): a grid of tiles, each with a Download, and a
 * larger view in a dialog. The picture opens by tap, click, Enter or Space; the dialog returns focus to its tile.
 * Pair it with `DownloadAll` for the ZIP.
 */
export function ImageGallery({ images, label }: { images: GalleryImage[]; label: string }) {
  const files = useMemo(() => images.map((i) => i.file), [images]);
  const urls = useObjectUrls(files);
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? undefined : images[open];

  return (
    <>
      <ul aria-label={label} className="imggal">
        {images.map((img, i) => (
          <li key={img.id} className="imgtile">
            <button type="button" className="imgtile-open" aria-label={`View ${img.label} larger`} onClick={() => setOpen(i)} disabled={!urls[i]}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {urls[i] && <img src={urls[i]} alt="" loading="lazy" decoding="async" draggable={false} />}
            </button>
            <div className="imgtile-foot">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{img.label}</p>
                <p className="truncate text-sm text-ink-3">{img.detail ?? formatBytes(img.file.size)}</p>
              </div>
              {urls[i] && <IconLink href={urls[i]!} download={img.file.name} icon="download" label={`Download ${img.label}`} />}
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={current !== undefined}
        onClose={() => setOpen(null)}
        title={current?.label ?? ""}
        description={current ? current.detail ?? formatBytes(current.file.size) : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>
            {open !== null && urls[open] && current && (
              <ButtonLink href={urls[open]!} download={current.file.name} variant="success" icon="download">Download</ButtonLink>
            )}
          </>
        }
      >
        {open !== null && urls[open] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls[open]} alt={current?.label ?? ""} className="imgview" />
        )}
      </Dialog>
    </>
  );
}
