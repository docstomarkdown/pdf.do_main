import type { InputHTMLAttributes, ReactNode } from "react";

/** A native checkbox with its label, 44 px tall. Use one per option; a group is just several of these. */
export function Checkbox({ children, className = "", ...rest }: { children: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children">) {
  return (
    <label className={`check ${className}`.trim()}>
      <input type="checkbox" className="check-input" {...rest} />
      <span>{children}</span>
    </label>
  );
}
