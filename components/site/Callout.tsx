import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * A quiet box that offers one next step: a title, a sentence and one action, on the soft surface. The "Keep it in pdf.do"
 * card under a result and the note about the platform at the foot of a tool page are both this.
 */
export function Callout({ title, text, action, icon, as: Tag = "div", className = "" }: {
  title: string;
  text: ReactNode;
  /** One button or link. */
  action: ReactNode;
  icon?: IconName;
  /** "aside" when it is a note beside the page's own content. */
  as?: "div" | "aside";
  className?: string;
}) {
  return (
    <Tag className={`soft grid items-center gap-3.5 rounded-2xl border border-line-soft p-5 text-center sm:grid-cols-[auto_1fr_auto] sm:text-left ${className}`.trim()}>
      {icon ? <span className="tool-card-icon mx-auto h-9 w-9 sm:mx-0" aria-hidden="true"><Icon name={icon} className="h-5 w-5" /></span> : <span className="hidden sm:block" />}
      <div>
        <p className="text-lg font-semibold tracking-tight">{title}</p>
        <p className="mt-0.5 text-ink-2">{text}</p>
      </div>
      <div>{action}</div>
    </Tag>
  );
}
