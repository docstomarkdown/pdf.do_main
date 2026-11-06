import type { ButtonHTMLAttributes } from "react";

/** A toggle button drawn as a pill: size presets, "Invert". `pressed` is announced to screen readers. */
export function Chip({ pressed, className = "", ...rest }: { pressed: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed">) {
  return <button type="button" aria-pressed={pressed} className={`chip ${className}`.trim()} {...rest} />;
}
