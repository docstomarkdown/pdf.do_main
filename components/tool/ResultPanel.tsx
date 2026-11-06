"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { ActionBar } from "@/components/ui/ActionBar";
import { Button } from "@/components/ui/Button";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { Icon } from "@/components/ui/Icon";
import { setHandoff } from "@/lib/handoff";
import { getTool } from "@/lib/tools";

/**
 * Shown when a tool finishes: what changed (`summary`, and `children` for a size comparison and an honest note), the
 * download, and a way to keep going. "Keep going" hands the result to the next tool in memory, so the person does not
 * have to download and re-upload it. When it appears it takes focus and scrolls into view, so a screen reader and a
 * phone both land on the result.
 * A tool that makes one file passes `url`, `file` and `downloadLabel`. A tool that makes several passes none of them and
 * puts `MultiResult` (or an `ImageGallery` with `DownloadAll`) in `children`, which carry their own downloads; there is
 * nothing to keep going with then.
 */
type OneFile = { url: string; file: File; downloadLabel: string };
type NoFile = { url?: undefined; file?: undefined; downloadLabel?: undefined };

export function ResultPanel({
  url, file, fromTool, nextSlugs, downloadLabel, summary, onReset, testId, focusOnArrival = true, children,
}: {
  fromTool: string;
  nextSlugs: string[];
  summary: ReactNode;
  onReset: () => void;
  testId: string;
  /** Move focus to the panel and scroll it into view when it appears. On for every tool; the gallery turns it off so a specimen does not move the page. */
  focusOnArrival?: boolean;
  children?: ReactNode;
} & (OneFile | NoFile)) {
  const router = useRouter();
  const next = file ? nextSlugs.map(getTool).filter((t) => t !== undefined) : [];
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusOnArrival) return;
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: "nearest" });
  }, [focusOnArrival]);

  return (
    <div ref={panel} tabIndex={-1} data-testid={testId} className="result">
      <div className="result-head">
        <p className="result-done"><Icon name="check" className="h-6 w-6" /> Done</p>
        <Button variant="ghost" size="sm" onClick={onReset}>Start over</Button>
      </div>
      <div className="result-summary">{summary}</div>
      {children && <div className="mt-4">{children}</div>}

      {url && file && (
        <ActionBar className="actionbar-panel">
          <DownloadButton url={url} file={file}>{downloadLabel}</DownloadButton>
        </ActionBar>
      )}

      {next.length > 0 && (
        <div className="result-keep">
          <p className="result-keep-title">Keep going with this file</p>
          <ul className="flex flex-wrap gap-2">
            {next.map((t) => (
              <li key={t.slug}>
                <Button
                  variant="secondary"
                  icon={t.icon}
                  onClick={() => { if (file) setHandoff(file, fromTool); router.push(`/${t.slug}`); }}
                >
                  {t.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
