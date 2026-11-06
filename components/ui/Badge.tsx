import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "neutral" | "warn" | "ok" | "bad" | "info" | "act";
const tones: Record<Tone, string> = { neutral: "", warn: "badge-warn", ok: "badge-ok", bad: "badge-bad", info: "badge-info", act: "badge-act" };

/** A short fact or warning on a file: "48 pages", "Text not selectable". */
export function Badge({ tone = "neutral", icon, children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  return (
    <span className={`badge ${tones[tone]}`.trim()}>
      {icon && <Icon name={icon} className="h-3 w-3" />}
      {children}
    </span>
  );
}
