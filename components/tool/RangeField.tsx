import { TextField } from "@/components/ui/Field";

/** Type page numbers and ranges ("2, 5-7"). The caller parses the text (lib/ranges.ts) and passes back any error. */
export function RangeField({ label, value, onChange, error, disabled, className, placeholder = "e.g. 2, 5-7", hint = "Click pages below, or type page numbers and ranges." }: {
  label: string; value: string; onChange: (text: string) => void; error?: string; disabled?: boolean; className?: string;
  placeholder?: string; hint?: string;
}) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hint={hint}
      disabled={disabled}
      className={className}
      inputMode="numeric"
    />
  );
}
