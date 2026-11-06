import { useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from "react";

const control =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-600 disabled:opacity-60";

export function SelectField({ label, children, className = "", ...rest }: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <select id={id} className={control} {...rest}>{children}</select>
    </div>
  );
}

export function TextField({ label, hint, error, className = "", ...rest }: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const note = `${id}-note`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? note : undefined} className={`${control} ${error ? "border-red-500" : ""}`} {...rest} />
      {(error || hint) && <p id={note} className={`mt-1.5 text-sm ${error ? "text-red-700" : "text-slate-600"}`}>{error ?? hint}</p>}
    </div>
  );
}
