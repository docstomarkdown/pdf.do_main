import { IconButton } from "@/components/ui/IconButton";

/** Four arrow buttons that move a mark a little: the button route for anything that can also be dragged. */
export function NudgePad({ onNudge, step = 2, legend = "Nudge" }: { onNudge: (dx: number, dy: number) => void; step?: number; legend?: string }) {
  return (
    <div role="group" aria-label={legend}>
      <span className="lbl" aria-hidden="true">{legend}</span>
      <div className="nudge">
        <IconButton icon="arrow-up" label="Move up" onClick={() => onNudge(0, -step)} />
        <IconButton icon="arrow-left" label="Move left" onClick={() => onNudge(-step, 0)} />
        <IconButton icon="arrow-down" label="Move down" onClick={() => onNudge(0, step)} />
        <IconButton icon="arrow-right" label="Move right" onClick={() => onNudge(step, 0)} />
      </div>
    </div>
  );
}
