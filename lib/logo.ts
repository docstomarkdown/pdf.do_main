/**
 * pdf.do's logo, drawn once (the owner chose it on 2026-11-13): a page with its folded corner, three dots and a small
 * tail, as a line. It never sits in a tile or a block of colour: it stands on its own, in petrol (`--color-logo`, decisions/0026; it was the brand blue until 2026-11-14) on light and
 * dark surfaces and in white on petrol ones. `components/site/Logo.tsx` draws it; `app/icon.svg` is its cut for
 * the browser tab, a little heavier so it holds at 16 px (`tests/logo.spec.ts` keeps the two the same drawing). The
 * platform app has the same drawing in its own brand folder.
 *
 * On a 24-unit grid. The viewBox is the drawing plus its line, and square.
 */
export const LOGO = {
  viewBox: "1.8 1.8 20.4 20.4",
  strokeWidth: 1.8,
  /** The page, with its corner cut and the tail at the foot. */
  outline: "M7.5 3H13.5L19 8.5V15.5A2.5 2.5 0 0 1 16.5 18H8L5 21V5.5A2.5 2.5 0 0 1 7.5 3Z",
  /** The folded corner. */
  fold: "M13.5 3V6.5A2 2 0 0 0 15.5 8.5H19",
  dots: [
    [8.6, 13.2],
    [12, 13.2],
    [15.4, 13.2],
  ],
  dotRadius: 1,
} as const;
