import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "info" | "warn" | "error" | "success";
const tones: Record<Tone, { box: string; icon: IconName }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-950", icon: "info" },
  warn: { box: "border-amber-300 bg-amber-50 text-amber-950", icon: "alert" },
  error: { box: "border-red-300 bg-red-50 text-red-900", icon: "alert" },
  success: { box: "border-emerald-300 bg-emerald-50 text-emerald-950", icon: "check" },
};

export function Alert({ tone = "info", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div role={tone === "error" || tone === "warn" ? "alert" : "status"} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${t.box} ${className}`}>
      <Icon name={t.icon} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
