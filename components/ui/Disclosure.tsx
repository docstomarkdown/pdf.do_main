import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** "More options": the native details element, so it needs no script and works with a keyboard. */
export function Disclosure({ summary, children, defaultOpen, className = "" }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <details open={defaultOpen} className={`disc ${className}`.trim()}>
      <summary className="disc-summary">
        {summary}
        <Icon name="chevron-down" className="disc-chev h-5 w-5 shrink-0" />
      </summary>
      <div className="disc-body">{children}</div>
    </details>
  );
}
