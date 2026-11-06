/**
 * Working, and it cannot say how long. Pass `value` (0 to 1) for a determinate ring when the fraction is known.
 * Without a `label` it is decorative (put it inside a button or beside text that says what is happening);
 * with one it announces itself as a status. It takes the current text colour.
 */
export function Spinner({ size = 20, value, label, className = "" }: { size?: number; value?: number; label?: string; className?: string }) {
  const circumference = 2 * Math.PI * 9;
  const fraction = value === undefined ? undefined : Math.min(1, Math.max(0, value));
  const svg = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="3" aria-hidden="true" className={`${fraction === undefined ? "spinner" : "shrink-0"} ${className}`.trim()}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" />
      {fraction === undefined ? (
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" />
      ) : (
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeLinecap="round" strokeDasharray={`${(circumference * fraction).toFixed(2)} ${circumference.toFixed(2)}`} transform="rotate(-90 12 12)" />
      )}
    </svg>
  );
  if (!label) return svg;
  return (
    <span role="status" className="inline-flex items-center gap-2">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
