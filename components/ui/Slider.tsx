import { useId } from "react";

/** A range slider whose current value is always readable beside its label, so it never needs a hover or a drag to read. */
export function Slider({
  label, min, max, step = 1, value, onChange, onCommit, format = String, className,
}: {
  label: string; min: number; max: number; step?: number; value: number;
  onChange: (value: number) => void;
  /** Runs when a change is finished (pointer released, focus left), for editors that undo in steps. A run of key presses is one change. */
  onCommit?: () => void;
  format?: (value: number) => string; className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="lbl flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="font-medium text-ink-3">{format(value)}</span>
      </label>
      <input id={id} type="range" className="slider" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onCommit} onBlur={onCommit} />
    </div>
  );
}
