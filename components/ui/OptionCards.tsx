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
      <legend className="mb-3 text-base font-semibold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="optcard">
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="optcard-input" />
            <span className="optcard-box">
              <span className="optcard-title">{o.label}</span>
              <span className="optcard-text">{o.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
