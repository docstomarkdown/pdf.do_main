"use client";

import { useId } from "react";
import { Segmented } from "@/components/ui/Segmented";
import type { PageSetup as Setup } from "@/lib/engines";

export type SetupValue = { size: Setup["size"]; orientation: Setup["orientation"]; margin: "none" | "small" | "large" };

const MARGIN_POINTS = { none: 0, small: 18, large: 36 } as const;

/** What the page engine takes, from the choices on screen. */
export const toPageSetup = (v: SetupValue): Setup => ({ size: v.size, orientation: v.orientation, margin: MARGIN_POINTS[v.margin] });

/** Page size, orientation and margin for a tool that makes pages. Orientation only matters on a fixed page size. */
export function PageSetup({ value, onChange, disabled }: { value: SetupValue; onChange: (value: SetupValue) => void; disabled?: boolean }) {
  const id = useId();
  const fixed = value.size !== "image";
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Segmented<SetupValue["size"]> legend="Page size" name={`${id}-size`} value={value.size} disabled={disabled} onChange={(size) => onChange({ ...value, size })}
        options={[{ value: "image", label: "Fit image" }, { value: "a4", label: "A4" }, { value: "letter", label: "Letter" }]} />
      <Segmented<SetupValue["orientation"]> legend="Orientation" name={`${id}-orientation`} value={value.orientation} disabled={disabled || !fixed} onChange={(orientation) => onChange({ ...value, orientation })}
        options={[{ value: "auto", label: "Auto" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
      <Segmented<SetupValue["margin"]> legend="Margin" name={`${id}-margin`} value={value.margin} disabled={disabled} onChange={(margin) => onChange({ ...value, margin })}
        options={[{ value: "none", label: "None" }, { value: "small", label: "Small" }, { value: "large", label: "Large" }]} />
      {!fixed && <p className="hint sm:col-span-3" style={{ marginTop: 0 }}>With Fit image each page is the size of its picture, so there is no orientation to choose.</p>}
    </div>
  );
}
