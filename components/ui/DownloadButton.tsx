import type { ReactNode } from "react";
import { ButtonLink } from "./Button";

/** The one green button: a real link to a file made in the browser, so it can be saved. The label names what is saved. */
export function DownloadButton({ url, file, children, className }: { url: string; file: File; children: ReactNode; className?: string }) {
  return <ButtonLink href={url} download={file.name} variant="success" size="lg" icon="download" className={className}>{children}</ButtonLink>;
}
