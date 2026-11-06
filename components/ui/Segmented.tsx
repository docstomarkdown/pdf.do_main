/** Two to four mutually exclusive choices as joined buttons. Native radios underneath, so the arrow keys work. */
export function Segmented<T extends string>({
  legend, name, value, onChange, options, disabled, className,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <fieldset disabled={disabled} className={`min-w-0 ${className ?? ""}`.trim()}>
      <legend className="lbl">{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.value} className="seg-item">
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="seg-input" />
            <span className="seg-label">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
