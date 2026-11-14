"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { ActionBar } from "@/components/ui/ActionBar";
import { Button } from "@/components/ui/Button";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { Icon } from "@/components/ui/Icon";
import { setHandoff } from "@/lib/handoff";
import { PLATFORM_PREVIEW } from "@/lib/site";
import { Callout } from "@/components/site/Callout";
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
  url, file, fromTool, nextSlugs, downloadLabel, summary, onReset, startsOver = false, testId, focusOnArrival = true, children,
}: {
  fromTool: string;
  nextSlugs: string[];
  summary: ReactNode;
  onReset: () => void;
  /**
   * What the quiet button in the header is called, which depends on what `onReset` does. In most tools the file stays and
   * the options come back: "Back to options". Where it also clears the files the tool was given (Merge, Images to PDF),
   * pass this and the button says "Start over". The label has to be true of the tool it is in.
   */
  startsOver?: boolean;
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

  // Going back takes this panel away, and the button that was pressed with it. Focus then goes to the tool around the
  // panel (the region `ToolPage` marks), not to nowhere: the next Tab is the tool's first control, and a screen reader
  // says which tool it is in. The page does not move.
  const leave = () => {
    const tool = panel.current?.closest<HTMLElement>("[data-tool-region]");
    onReset();
    tool?.focus({ preventScroll: true });
  };

  return (
    <>
    <div ref={panel} tabIndex={-1} data-testid={testId} className="result">
      <div className="result-head">
        <p className="result-done"><Icon name="check" className="h-6 w-6" /> Done</p>
        <Button variant="ghost" size="sm" onClick={leave}>{startsOver ? "Start over" : "Back to options"}</Button>
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
    {/* Preview only (lib/site.ts): the moment an account helps, offered beside the result and never in its way. There
        are no accounts yet, so the live build leaves it out. */}
    {PLATFORM_PREVIEW && file && (
      <Callout className="mt-4" icon="bookmark" title="Keep it in pdf.do"
        text="Save this file to your context, beside the chats and documents it belongs with, so any AI you use can find it. Free."
        action={<Button variant="secondary">Keep this file</Button>} />
    )}
    </>
  );
}
