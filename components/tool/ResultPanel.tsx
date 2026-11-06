"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { setHandoff } from "@/lib/handoff";
import { getTool } from "@/lib/tools";

/**
 * Shown when a tool finishes: the download, what changed, and a way to keep going. "Keep going" hands
 * the result to the next tool in memory, so the user does not have to download and re-upload it.
 */
export function ResultPanel({
  url, file, fromTool, nextSlugs, downloadLabel, summary, onReset, testId, children,
}: {
  url: string;
  file: File;
  fromTool: string;
  nextSlugs: string[];
  downloadLabel: string;
  summary: ReactNode;
  onReset: () => void;
  testId: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const next = nextSlugs.map(getTool).filter((t) => t !== undefined);

  return (
    <div data-testid={testId} className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-lg font-bold text-emerald-900">
        <Icon name="check" className="h-6 w-6" /> Done
      </p>
      <div className="mt-3 text-slate-900">{summary}</div>
      {children && <div className="mt-4">{children}</div>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink href={url} download={file.name} variant="success" size="lg" icon="download" className="w-full sm:w-auto">{downloadLabel}</ButtonLink>
        <Button variant="ghost" onClick={onReset} className="w-full sm:w-auto">Start over</Button>
      </div>

      {next.length > 0 && (
        <div className="mt-7 border-t border-emerald-200 pt-5">
          <p className="text-sm font-semibold text-slate-900">Keep going with this file</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {next.map((t) => (
              <li key={t.slug}>
                <Button
                  variant="secondary"
                  icon={t.icon}
                  onClick={() => { setHandoff(file, fromTool); router.push(`/${t.slug}`); }}
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
