import type { CSSProperties } from "react";
import type { NumberOptions } from "./engines";

/**
 * Where a number or identifier sits on the page preview, worked out from the page's own size in points, so it matches the
 * saved page at any zoom. Used by Add page numbers and Bates numbering; the page engine places the saved text the same way.
 */
export function markStyle(position: NumberOptions["position"], margin: number, size: number, width: number, height: number): CSSProperties {
  const [row, column] = position;
  const style: CSSProperties = { position: "absolute", fontSize: `${(size / width) * 100}cqw`, lineHeight: 1, whiteSpace: "nowrap" };
  if (column === "l") style.left = `${(margin / width) * 100}%`;
  else if (column === "r") style.right = `${(margin / width) * 100}%`;
  else style.left = "50%";
  if (row === "t") style.top = `${(margin / height) * 100}%`;
  else if (row === "b") style.bottom = `${(margin / height) * 100}%`;
  else style.top = "50%";
  const x = column === "c" ? "-50%" : "0";
  const y = row === "m" ? "-50%" : "0";
  if (x !== "0" || y !== "0") style.transform = `translate(${x}, ${y})`;
  return style;
}
