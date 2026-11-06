import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** What to show when there is nothing yet: say what is missing and what to do. */
export function EmptyState({ icon = "file", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} className="mx-auto h-8 w-8 text-ink-3" />
      <p className="mt-2 font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  );
}
