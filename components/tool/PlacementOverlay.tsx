"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

const clamp = (n: number, low = 0, high = 100) => Math.min(high, Math.max(low, n));

/**
 * Something placed on a page: a watermark, a stamp, a signature. Put it inside the page preview. Its position is the
 * centre, as percentages of the page's width and height, so it stays put at every zoom.
 * It moves by drag (mouse, touch or pen), by the arrow keys (Shift for bigger steps), and the tool offers buttons too
 * (see NudgePad). With `size` and `onResize` it also resizes: drag the corner handle, or press + and -.
 * `onMove` runs during a change; `onCommit` runs when the change is finished, so an editor can make one undo step.
 */
export function PlacementOverlay({
  x, y, onMove, onCommit, label, size, onResize, minSize = 5, maxSize = 100, rotate = 0, step = 2, className = "", children,
}: {
  x: number;
  y: number;
  onMove: (x: number, y: number) => void;
  onCommit?: () => void;
  label: string;
  /** Width as a percentage of the page's width. Leave it out for something that sizes itself, like text. */
  size?: number;
  onResize?: (size: number) => void;
  minSize?: number;
  maxSize?: number;
  rotate?: number;
  step?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize"; dx: number; dy: number } | null>(null);
  const hint = useId();
  const resizable = onResize !== undefined && size !== undefined;

  const pointer = (e: PointerEvent) => {
    const page = ref.current!.parentElement!.getBoundingClientRect();
    return { px: ((e.clientX - page.left) / page.width) * 100, py: ((e.clientY - page.top) / page.height) * 100 };
  };

  function start(e: PointerEvent<HTMLElement>, mode: "move" | "resize") {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const { px, py } = pointer(e);
    drag.current = { mode, dx: px - x, dy: py - y };
    ref.current!.setPointerCapture(e.pointerId); // so the drag carries on outside the mark
    ref.current!.focus();
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const { px, py } = pointer(e);
    if (drag.current.mode === "move") onMove(clamp(px - drag.current.dx), clamp(py - drag.current.dy));
    else onResize?.(clamp(2 * Math.abs(px - x), minSize, maxSize));
  }

  function end() {
    if (!drag.current) return;
    drag.current = null;
    onCommit?.();
  }

  function keys(e: KeyboardEvent<HTMLDivElement>) {
    const amount = step * (e.shiftKey ? 5 : 1);
    const moves: Record<string, [number, number]> = { ArrowUp: [0, -amount], ArrowDown: [0, amount], ArrowLeft: [-amount, 0], ArrowRight: [amount, 0] };
    const delta = moves[e.key];
    if (delta) {
      e.preventDefault();
      onMove(clamp(x + delta[0]), clamp(y + delta[1]));
      onCommit?.();
    } else if (resizable && (e.key === "+" || e.key === "=" || e.key === "-")) {
      e.preventDefault();
      onResize(clamp(size + (e.key === "-" ? -amount : amount), minSize, maxSize));
      onCommit?.();
    }
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      aria-describedby={hint}
      tabIndex={0}
      className={`mark ${className}`.trim()}
      style={{ left: `${x}%`, top: `${y}%`, width: size === undefined ? undefined : `${size}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
      onPointerDown={(e) => start(e, "move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={keys}
    >
      {children}
      <span aria-hidden="true" className="mark-corner" style={{ left: "-0.4rem", top: "-0.4rem" }} />
      <span aria-hidden="true" className="mark-corner" style={{ right: "-0.4rem", top: "-0.4rem" }} />
      <span aria-hidden="true" className="mark-corner" style={{ left: "-0.4rem", bottom: "-0.4rem" }} />
      {resizable ? (
        <span aria-hidden="true" className="mark-resize" data-testid="resize-handle" onPointerDown={(e) => start(e, "resize")} />
      ) : (
        <span aria-hidden="true" className="mark-corner" style={{ right: "-0.4rem", bottom: "-0.4rem" }} />
      )}
      <span id={hint} className="sr-only">Drag it, or use the arrow keys. Hold Shift for bigger steps.{resizable ? " Press plus or minus to resize." : ""}</span>
    </div>
  );
}
