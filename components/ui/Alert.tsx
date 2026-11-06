import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { IconButton } from "./IconButton";

type Tone = "info" | "warn" | "error" | "success";
const icons: Record<Tone, IconName> = { info: "info", warn: "alert", error: "alert", success: "check" };

/**
 * A message inside the page. Errors and limits live here and stay put (a toast is never the only place they appear).
 * `action` is one button for the obvious next step; `onDismiss` adds a close button.
 */
export function Alert({
  tone = "info", title, children, action, onDismiss, className = "",
}: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; onDismiss?: () => void; className?: string }) {
  return (
    <div role={tone === "error" || tone === "warn" ? "alert" : "status"} className={`alert alert-${tone} ${className}`.trim()}>
      <Icon name={icons[tone]} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="alert-body">
        {title && <p className="alert-title">{title}</p>}
        {children}
        {action && <div className="alert-actions">{action}</div>}
      </div>
      {onDismiss && <IconButton icon="close" label="Dismiss" onClick={onDismiss} className="alert-dismiss" />}
    </div>
  );
}
