import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Shell = { label: string; hint?: string; error?: string; className?: string };
type ControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

/**
 * The label, hint and error that every control gets, so none of them repeats the markup. The control is drawn by
 * `children`, which receives the id and the accessibility attributes to put on it. `className` styles the wrapper.
 */
export function Field({ label, hint, error, className = "", children }: Shell & { children: (control: ControlProps) => ReactNode }) {
  const id = useId();
  const note = `${id}-note`;
  return (
    <div className={className}>
      <label htmlFor={id} className="lbl">{label}</label>
      {children({ id, "aria-describedby": error || hint ? note : undefined, "aria-invalid": error ? true : undefined })}
      {(error || hint) && <p id={note} className={`hint ${error ? "hint-error" : ""}`.trim()}>{error ?? hint}</p>}
    </div>
  );
}

export function TextField({ label, hint, error, className, ...rest }: Shell & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">) {
  return <Field label={label} hint={hint} error={error} className={className}>{(c) => <input className="ctl" {...c} {...rest} />}</Field>;
}

export function TextArea({ label, hint, error, className, rows = 6, ...rest }: Shell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">) {
  return <Field label={label} hint={hint} error={error} className={className}>{(c) => <textarea className="ctl" rows={rows} {...c} {...rest} />}</Field>;
}

export function SelectField({ label, hint, error, className, children, ...rest }: Shell & { children: ReactNode } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id">) {
  return <Field label={label} hint={hint} error={error} className={className}>{(c) => <select className="ctl" {...c} {...rest}>{children}</select>}</Field>;
}
