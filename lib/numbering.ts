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

export const BATES_DIGITS = [3, 4, 5, 6, 7, 8, 9, 10];

/**
 * A Bates identifier: the prefix, the number padded with zeros to `digits`, the suffix. A number longer than `digits` is
 * written in full, never cut. The page engine builds the same text.
 */
export function batesLabel(prefix: string, value: number, digits: number, suffix: string): string {
  return `${prefix}${String(value).padStart(digits, "0")}${suffix}`;
}

// What Helvetica in a PDF can write beyond plain ASCII and Latin-1 (the rest of the WinAnsi set).
const WINANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/**
 * The first character of `text` the numbering font cannot write, or null when it can write all of it. This is the quick
 * check for the form; the engine checks again against the font itself before it writes anything.
 */
export function unwritable(text: string): string | null {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const plain = code >= 0x20 && code <= 0x7e;
    const latin1 = code >= 0xa1 && code <= 0xff && code !== 0xad;
    if (!plain && !latin1 && !WINANSI_EXTRAS.includes(ch)) return ch;
  }
  return null;
}
