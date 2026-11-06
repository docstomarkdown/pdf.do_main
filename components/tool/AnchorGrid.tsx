import { useId } from "react";

export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

const ANCHORS: { value: Anchor; label: string }[] = [
  { value: "tl", label: "Top left" }, { value: "tc", label: "Top centre" }, { value: "tr", label: "Top right" },
  { value: "ml", label: "Middle left" }, { value: "mc", label: "Middle centre" }, { value: "mr", label: "Middle right" },
  { value: "bl", label: "Bottom left" }, { value: "bc", label: "Bottom centre" }, { value: "br", label: "Bottom right" },
];

/** Where each position puts the centre of a mark, as percentages of the page. Inset, so the mark stays on the page. */
export const ANCHOR_POINTS: Record<Anchor, { x: number; y: number }> = {
  tl: { x: 18, y: 12 }, tc: { x: 50, y: 12 }, tr: { x: 82, y: 12 },
  ml: { x: 18, y: 50 }, mc: { x: 50, y: 50 }, mr: { x: 82, y: 50 },
  bl: { x: 18, y: 88 }, bc: { x: 50, y: 88 }, br: { x: 82, y: 88 },
};

/**
 * Nine positions on a page, as native radios, so the arrow keys work. `value` is null after the mark has been moved
 * by hand to somewhere that is none of the nine: then no position is selected.
 */
export function AnchorGrid({ legend = "Position", value, onChange, disabled }: {
  legend?: string; value: Anchor | null; onChange: (anchor: Anchor) => void; disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="lbl">{legend}</legend>
      <div className="anchor-grid">
        {ANCHORS.map((a) => (
          <label key={a.value} className="anchor-cell">
            <input type="radio" name={name} value={a.value} checked={value === a.value} onChange={() => onChange(a.value)} aria-label={a.label} className="anchor-input" />
            <span aria-hidden="true" className="anchor-dot" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
