/** A radio group drawn as cards. Native radios underneath, so keyboard and screen readers work. */
export function OptionCards<T extends string>({
  legend, name, value, onChange, options, disabled,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; description: string }[];
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-3 text-base font-semibold text-slate-900">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="relative block cursor-pointer has-disabled:cursor-not-allowed has-disabled:opacity-60">
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className="block h-full rounded-xl border border-slate-300 bg-white p-4 transition-colors hover:border-slate-400 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 peer-checked:ring-2 peer-checked:ring-indigo-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600">
              <span className="block font-semibold text-slate-900">{o.label}</span>
              <span className="mt-1 block text-sm text-slate-600">{o.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
