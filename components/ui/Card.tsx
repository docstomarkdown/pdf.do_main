import type { HTMLAttributes } from "react";

/** The bordered surface every panel is drawn on. Padding is yours: pass it in `className` (for example `p-4`). */
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`.trim()} {...rest} />;
}
