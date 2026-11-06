import type { NumberOptions } from "./engines";

export type NumberFormat = NumberOptions["format"];

export const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: "n", label: "1" },
  { value: "page-n", label: "Page 1" },
  { value: "n-of-m", label: "1 of 9" },
  { value: "page-n-of-m", label: "Page 1 of 9" },
];

/**
 * The text that goes on a page: `value` is its number and `last` the number on the final numbered page. The page engine
 * (public/engines/pages.worker.js) builds the same text; the tests read the saved PDF to keep the two in step.
 */
export function numberLabel(format: NumberFormat, value: number, last: number): string {
  switch (format) {
    case "page-n": return `Page ${value}`;
    case "n-of-m": return `${value} of ${last}`;
    case "page-n-of-m": return `Page ${value} of ${last}`;
    default: return `${value}`;
  }
}
