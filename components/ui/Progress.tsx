/** Determinate when `value` (0 to 1) is given, otherwise an indeterminate bar. */
export function Progress({ value, label, onCancel }: { value?: number; label: string; onCancel?: () => void }) {
  const pct = value === undefined ? undefined : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="text-sm font-medium text-slate-800">{label}</p>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Cancel
          </button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={pct === undefined ? "h-full w-1/3 animate-[pdfdo-slide_1.2s_ease-in-out_infinite] rounded-full bg-indigo-600" : "h-full rounded-full bg-indigo-600 transition-[width]"}
          style={pct === undefined ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
