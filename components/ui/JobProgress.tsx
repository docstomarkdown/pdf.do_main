import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

export type Stage = { name: string; state: "done" | "now" | "todo" };

/**
 * What a running job shows, in the place where its action button was. A bar when the fraction is known (`value`, 0 to
 * 1), a spinner with words when it is not. `stages` names the steps. Cancel is always offered when `onCancel` is given.
 * The label is a polite status, so a screen reader hears it change.
 */
export function JobProgress({
  label, sublabel, value, onCancel, stages,
}: { label: string; sublabel?: string; value?: number; onCancel?: () => void; stages?: Stage[] }) {
  const pct = value === undefined ? undefined : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3.5">
        {pct === undefined && <Spinner size={28} className="text-action" />}
        <div className="min-w-0 flex-1">
          <p role="status" aria-live="polite" className="font-semibold">{label}</p>
          {sublabel && <p className="text-sm text-ink-3">{sublabel}</p>}
        </div>
        {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
      </div>
      {pct !== undefined && (
        <div role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="bar mt-3">
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {stages && (
        <ol className="stages">
          {stages.map((s) => (
            <li key={s.name} className={`stage ${s.state === "done" ? "stage-done" : s.state === "now" ? "stage-now" : ""}`.trim()}>
              {s.state === "done" && <Icon name="check" className="h-3.5 w-3.5" />}
              {s.name}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
