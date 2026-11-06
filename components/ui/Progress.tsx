import { Button } from "./Button";
import { Card } from "./Card";

/** Determinate when `value` (0 to 1) is given, otherwise an indeterminate bar. */
export function Progress({ value, label, onCancel }: { value?: number; label: string; onCancel?: () => void }) {
  const pct = value === undefined ? undefined : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="text-sm font-medium">{label}</p>
        {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
      </div>
      <div role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="bar">
        <div className={pct === undefined ? "bar-fill bar-fill-indeterminate" : "bar-fill"} style={pct === undefined ? undefined : { width: `${pct}%` }} />
      </div>
    </Card>
  );
}
