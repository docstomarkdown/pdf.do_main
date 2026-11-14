import { LOGO } from "@/lib/logo";

/**
 * pdf.do's logo (`lib/logo.ts`), in the colour of the text around it: a class sets it (`text-logo`: petrol, lighter in dark mode, decisions/0026).
 * Decorative: the name always sits beside it, so it is hidden from screen readers.
 *
 * `size` and `color` are for the pictures drawn when the site is built (link previews, the home-screen icon), which have
 * no classes to size or colour it by.
 */
export function Logo({ className, size, color }: { className?: string; size?: number; color?: string }) {
  const ink = color ?? "currentColor";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={LOGO.viewBox}
      fill="none"
      stroke={ink}
      strokeWidth={LOGO.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={LOGO.outline} />
      <path d={LOGO.fold} />
      {LOGO.dots.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={LOGO.dotRadius} fill={ink} stroke="none" />
      ))}
    </svg>
  );
}
